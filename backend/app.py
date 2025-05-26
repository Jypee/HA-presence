from flask import Flask, request, jsonify
import requests
import os
from datetime import datetime, timedelta
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

import yaml
import logging

def get_ha_config():
    config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')
    print(f"[DEBUG] Reading config from: {config_path}")
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    print(f"[DEBUG] Loaded config: {config}")
    return config

def get_ha_headers():
    config = get_ha_config()
    return {
        'Authorization': f"Bearer {config.get('ha_token', 'YOUR_LONG_LIVED_TOKEN')}",
        'Content-Type': 'application/json',
    }, config.get('ha_url', 'http://localhost:8123')


@app.route('/api/persons', methods=['GET'])
def get_persons():
    headers, ha_url = get_ha_headers()
    app.logger.info(f"Using Home Assistant URL: {ha_url}")
    r = requests.get(f'{ha_url}/api/states', headers=headers)
    data = r.json()
    persons = [entity for entity in data if entity['entity_id'].startswith('person.')]
    return jsonify(persons)

@app.route('/api/zones', methods=['GET'])
def get_zones():
    headers, ha_url = get_ha_headers()
    app.logger.info(f"Using Home Assistant URL: {ha_url}")
    r = requests.get(f'{ha_url}/api/states', headers=headers)
    data = r.json()
    zones = [entity for entity in data if entity['entity_id'].startswith('zone.')]
    return jsonify(zones)

@app.route('/api/history', methods=['GET'])
def get_history():
    import collections
    entity_id = request.args.get('entity_id')
    start = request.args.get('start')
    end = request.args.get('end')
    if not (entity_id and start and end):
        return jsonify({'error': 'Missing parameters'}), 400
    headers, ha_url = get_ha_headers()
    app.logger.info(f"Using Home Assistant URL: {ha_url}")
    url = f"{ha_url}/api/history/period/{start}?filter_entity_id={entity_id}&end_time={end}"
    r = requests.get(url, headers=headers)
    history = r.json()
    # history is a list of lists (one per entity)
    events = history[0] if history and len(history) > 0 else []
    # Group events by day, filter for 09:00-18:00
    day_states = collections.defaultdict(list)
    # Fetch all zones once
    zones_resp = requests.get(f'{ha_url}/api/states', headers=headers)
    zones_data = zones_resp.json()
    zones = [z for z in zones_data if z['entity_id'].startswith('zone.')]
    # Get device_trackers for this person
    person = next((p for p in zones_data if p['entity_id'] == entity_id), None)
    device_trackers = []
    if person and 'device_trackers' in person.get('attributes', {}):
        device_trackers = person['attributes']['device_trackers']
    # Helper: check if lat/lon is within a zone
    def zone_for_location(lat, lon):
        from math import radians, cos, sin, sqrt, atan2
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371000
            phi1, phi2 = radians(lat1), radians(lat2)
            dphi = radians(lat2-lat1)
            dlambda = radians(lon2-lon1)
            a = sin(dphi/2)**2 + cos(phi1)*cos(phi2)*sin(dlambda/2)**2
            return 2*R*atan2(sqrt(a), sqrt(1-a))
        for z in zones:
            zattr = z.get('attributes', {})
            zlat, zlon = zattr.get('latitude'), zattr.get('longitude')
            zrad = zattr.get('radius', 100)
            if zlat is not None and zlon is not None:
                d = haversine(lat, lon, zlat, zlon)
                if d <= zrad:
                    return zattr.get('friendly_name', z['entity_id'].split('.')[-1])
        return None
    for event in events:
        ts = event.get('last_changed') or event.get('last_updated')
        if not ts:
            continue
        dt = datetime.fromisoformat(ts[:19])  # 'YYYY-MM-DDTHH:MM:SS'
        day = dt.strftime('%Y-%m-%d')
        state = event['state']
        
        # If not_home, try device_tracker
        if state == 'not_home' and device_trackers:
            # For now, just use the first tracker
            tracker_id = device_trackers[0]
            # Fetch tracker state at this time
            t_url = f"{ha_url}/api/history/period/{dt.isoformat()}?filter_entity_id={tracker_id}&end_time={dt.isoformat()}"
            t_resp = requests.get(t_url, headers=headers)
            t_hist = t_resp.json()
            t_events = t_hist[0] if t_hist and len(t_hist) > 0 else []
            if t_events:
                t_ev = t_events[-1]
                lat = t_ev.get('attributes', {}).get('latitude')
                lon = t_ev.get('attributes', {}).get('longitude')
                if lat is not None and lon is not None:
                    zone_name = zone_for_location(lat, lon)
                    if zone_name:
                        state = zone_name
        
        day_states[day].append({
            'timestamp': dt,
            'state': state
        })
    
    # For each day, calculate actual time spent in each location during working hours
    result = []
    for day in sorted(day_states.keys()):
        events_list = day_states[day]
        if not events_list:
            result.append({
                'date': day, 
                'state': 'unknown',
                'top_locations': []
            })
            continue
            
        # Sort events by timestamp
        events_list.sort(key=lambda x: x['timestamp'])
        
        # Calculate time spent in each location during working hours (9:00-18:00)
        location_durations = collections.defaultdict(float)
        total_working_minutes = 0
        
        # Define working hours for the day
        day_date = datetime.strptime(day, '%Y-%m-%d')
        work_start = day_date.replace(hour=9, minute=0, second=0)
        work_end = day_date.replace(hour=18, minute=0, second=0)
        
        for i in range(len(events_list)):
            current_event = events_list[i]
            current_time = current_event['timestamp']
            current_state = current_event['state']
            
            # Determine the end time for this state
            if i < len(events_list) - 1:
                next_time = events_list[i + 1]['timestamp']
            else:
                # Last event of the day, assume it lasts until end of working hours or current time
                next_time = min(work_end, datetime.now().replace(second=0, microsecond=0))
            
            # Calculate overlap with working hours
            period_start = max(current_time, work_start)
            period_end = min(next_time, work_end)
            
            if period_start < period_end:
                # There's an overlap with working hours
                duration_minutes = (period_end - period_start).total_seconds() / 60
                location_durations[current_state] += duration_minutes
                total_working_minutes += duration_minutes
        
        # If no events during working hours, but we have events, extrapolate
        if total_working_minutes == 0 and events_list:
            # Find the state closest to working hours
            closest_event = min(events_list, key=lambda x: abs((x['timestamp'] - work_start).total_seconds()))
            location_durations[closest_event['state']] = 540  # Full 9 hours
            total_working_minutes = 540
        
        # Convert to percentages and create top locations list
        top_locations = []
        if total_working_minutes > 0:
            for location, duration in location_durations.items():
                percentage = (duration / 540) * 100  # 540 = 9 hours in minutes
                count = sum(1 for e in events_list if e['state'] == location)
                top_locations.append({
                    'location': location,
                    'count': count,
                    'percentage': round(percentage, 1),
                    'duration': round(duration, 1)
                })
            
            # Sort by duration (descending)
            top_locations.sort(key=lambda x: x['duration'], reverse=True)
            # Keep only top 3
            top_locations = top_locations[:3]
            
            main_state = top_locations[0]['location'] if top_locations else 'unknown'
        else:
            main_state = 'unknown'
        
        result.append({
            'date': day, 
            'state': main_state,
            'top_locations': top_locations
        })
    return jsonify(result)

@app.route('/')
def index():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
