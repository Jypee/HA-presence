# Home Assistant Presence Calendar

A calendar web app that visualizes user presence (home, office, or other zones) during working hours using data from your Home Assistant instance.

---

## Features
- Displays a calendar for each user, showing where they spent their working hours (09:00–18:00) each day
- Detects presence at home, office (e.g., "Boulot JP"), or any other zone
- Dropdown to select which user to view
- Color-coded by location
- Uses Home Assistant API for real-time data

---

## Requirements
- Python 3.8+
- Node.js 16+
- A running Home Assistant instance with:
  - Long-lived access token
  - Persons and device_trackers configured
  - Zones defined (e.g., home, office, etc.)

---

## Setup

### 1. Clone the repository
```bash
git clone <this-repo-url>
cd HA-presence
```

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Configure Home Assistant Access
Edit `backend/config.yaml`:
```yaml
ha_url: "https://your-ha-url"
ha_token: "YOUR_LONG_LIVED_TOKEN"
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## Running the App

### 1. Start the backend (Flask API)
```bash
cd backend
source venv/bin/activate
python app.py
```

The backend will run on http://localhost:5000

### 2. Start the frontend (React app)
```bash
cd frontend
npm start
```

The frontend will run on http://localhost:3000

---

## Usage
- Open http://localhost:3000 in your browser.
- Use the dropdown to select a user.
- The calendar will show where the user was during working hours for each day of the month.
- Colors:
  - Green: Home
  - Blue: Office (e.g., "Boulot JP")
  - Yellow: Other zone (zone name shown)

---

## Troubleshooting
- Ensure your Home Assistant URL and token are correct in `backend/config.yaml`.
- Your Home Assistant instance must be reachable from the machine running this app.
- Device trackers should provide GPS location for accurate zone detection.

---

## Security
- **Never commit your Home Assistant token to a public repository!**
- Keep `config.yaml` secure.

---

## Customization
- Adjust working hours or add more zone mappings by editing the backend code (`app.py`).
- Style or extend the frontend as needed in `frontend/src/App.js`.

---

## License
MIT
