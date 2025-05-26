import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const API_BASE = 'http://localhost:5000/api';

const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Icons for different location types
const getLocationIcon = (locationType) => {
  switch (locationType) {
    case 'home': return '🏠';
    case 'office': return '🏢';
    case 'other': return '📍';
    default: return '❓';
  }
};

// Enhanced color scheme for better visibility
const getLocationStyle = (locationType, isCurrentDay = false, isMobile = false) => {
  const baseStyle = {
    textAlign: 'center',
    height: isMobile ? 80 : 120, // Increased height for better visibility
    border: '1px solid #ddd',
    fontSize: isMobile ? '9px' : '11px',
    fontWeight: isCurrentDay ? 'bold' : 'normal',
    boxShadow: isCurrentDay ? '0 0 5px rgba(0,123,255,0.5)' : 'none',
    position: 'relative',
    padding: isMobile ? '2px' : '4px'
  };
  
  switch (locationType) {
    case 'home':
      return { ...baseStyle, background: 'linear-gradient(135deg, #a8e6cf, #88d8a3)', color: '#2d5a41' };
    case 'office':
      return { ...baseStyle, background: 'linear-gradient(135deg, #a8d5ff, #7bb8ff)', color: '#1e3a5f' };
    case 'other':
      return { ...baseStyle, background: 'linear-gradient(135deg, #ffd3a5, #ffa474)', color: '#7d4a1a' };
    default:
      return { ...baseStyle, background: '#f8f9fa', color: '#6c757d' };
  }
};

// Helper function to get location type based on location name
const getLocationTypeFromName = (locationName, personName, zones) => {
  if (!locationName || locationName === 'unknown') return 'unknown';
  
  if (locationName === 'home') return 'home';
  if (locationName === 'office') return 'office';
  
  // Check if it's an office for JP
  if (personName?.toLowerCase() === 'jp' && locationName.toLowerCase().includes('boulot')) {
    return 'office';
  }
  
  return 'other';
};

// Helper function to get friendly name for location
const getFriendlyLocationName = (locationName, personName, zones) => {
  if (!locationName || locationName === 'unknown') return 'Inconnu';
  
  if (locationName === 'home') return 'Maison';
  if (locationName === 'office') return 'Bureau';
  
  // Try to find zone friendly name
  const zone = zones.find(z => z.entity_id === `zone.${locationName}`);
  if (zone && zone.attributes && zone.attributes.friendly_name) {
    const friendlyName = zone.attributes.friendly_name;
    
    // Special case for JP's office
    if (personName?.toLowerCase() === 'jp' && friendlyName.toLowerCase().includes('boulot')) {
      return 'Bureau';
    }
    
    return friendlyName;
  }
  
  return locationName;
};

function getCalendarMatrix(year, month) {
  // month: 1-based (1=Jan)
  const firstDay = dayjs(`${year}-${month}-01`);
  const daysInMonth = firstDay.daysInMonth();
  let startDay = firstDay.day(); // 0=Sunday, 1=Monday, ...
  if (startDay === 0) startDay = 7; // Make Sunday = 7 for ISO week
  const calendar = [];
  let week = Array(7).fill(null);
  let day = 1;
  // Fill first week
  for (let i = startDay - 1; i < 7; i++) {
    week[i] = dayjs(`${year}-${month}-${String(day).padStart(2, '0')}`);
    day++;
  }
  calendar.push(week);
  // Fill next weeks
  while (day <= daysInMonth) {
    week = Array(7).fill(null);
    for (let i = 0; i < 7 && day <= daysInMonth; i++) {
      week[i] = dayjs(`${year}-${month}-${String(day).padStart(2, '0')}`);
      day++;
    }
    calendar.push(week);
  }
  return calendar;
}

function Calendar({ persons, zones, data, year, month, onMonthChange }) {
  const calendar = getCalendarMatrix(year, month);
  const today = dayjs();
  const currentMonth = dayjs(`${year}-${month}-01`);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      overflow: 'hidden' 
    }}>
      <div style={{ 
        marginBottom: 8, 
        padding: isMobile ? 8 : 10, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        borderRadius: 6, 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 6 : 0,
        flexShrink: 0
      }}>
        <button 
          onClick={() => onMonthChange('prev')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: isMobile ? '6px 8px' : '8px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: isMobile ? 12 : 14,
            transition: 'all 0.3s ease',
            order: isMobile ? 1 : 0
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          {isMobile ? '← Préc.' : '← Mois précédent'}
        </button>
        
        <h2 style={{ 
          margin: 0, 
          textAlign: 'center', 
          fontSize: isMobile ? 14 : 18, 
          flex: isMobile ? 'none' : 1,
          order: isMobile ? 0 : 1
        }}>
          📅 {currentMonth.format('MMMM YYYY')}
        </h2>
        
        <button 
          onClick={() => onMonthChange('next')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            padding: isMobile ? '6px 8px' : '8px 12px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: isMobile ? 12 : 14,
            transition: 'all 0.3s ease',
            order: isMobile ? 2 : 2
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          {isMobile ? 'Suiv. →' : 'Mois suivant →'}
        </button>
      </div>
      
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <table style={{ 
          borderCollapse: 'collapse', 
          width: '100%', 
          height: '100%',
          background: '#fff', 
          border: '2px solid #e9ecef',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <thead>
            <tr>
              {WEEK_DAYS.map((wd) => (
                <th key={wd} style={{ 
                  background: 'linear-gradient(135deg, #495057, #6c757d)', 
                  color: 'white', 
                  width: '14.28%',
                  padding: isMobile ? '6px 2px' : '8px 4px',
                  fontWeight: 'bold',
                  fontSize: isMobile ? 10 : 12
                }}>
                  {wd}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {persons.map((person) => (
              <React.Fragment key={person.entity_id}>
                {calendar.map((week, wIdx) => (
                  <tr key={wIdx + '-' + person.entity_id}>
                    {week.map((d, i) => {
                      if (!d) return <td key={i} style={{ background: '#f8f9fa', height: isMobile ? 80 : 120, border: '1px solid #dee2e6' }} />;
                      
                      const isCurrentDay = d.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
                      const dayData = data?.[person.entity_id]?.[d.format('YYYY-MM-DD')];
                      const loc = dayData?.state || '';
                      const topLocations = dayData?.topLocations || [];
                      
                      let locationType = 'unknown';
                      let displayText = d.date().toString();
                      
                      // Determine main location type from the primary state
                      if (loc === 'home') {
                        locationType = 'home';
                      } else if (loc === 'office') {
                        locationType = 'office';
                      } else if (loc && loc !== 'unknown') {
                        // Check if it's JP's office
                        const zone = zones.find(z => z.entity_id === `zone.${loc}`);
                        const zoneName = zone?.attributes?.friendly_name || loc;
                        
                        if (
                          (person.attributes.friendly_name || '').toLowerCase() === 'jp' &&
                          (zoneName.toLowerCase().includes('boulot') || loc.toLowerCase().includes('boulot'))
                        ) {
                          locationType = 'office';
                        } else {
                          locationType = 'other';
                        }
                      }
                      
                      const cellStyle = getLocationStyle(locationType, isCurrentDay, isMobile);
                      
                      // Create tooltip with detailed information
                      const tooltipText = `${d.format('DD/MM/YYYY')}\n${topLocations.map(tl => {
                        const friendlyName = getFriendlyLocationName(tl.location, person.attributes.friendly_name, zones);
                        return `${friendlyName}: ${tl.percentage}%`;
                      }).join('\n') || 'Aucune donnée'}`;
                      
                      return (
                        <td 
                          key={d.format('YYYY-MM-DD')} 
                          style={{
                            ...cellStyle,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                          }}
                          title={tooltipText}
                          onMouseOver={(e) => {
                            if (!isMobile) {
                              e.target.style.transform = 'scale(1.02)';
                              e.target.style.zIndex = '10';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isMobile) {
                              e.target.style.transform = 'scale(1)';
                              e.target.style.zIndex = '1';
                            }
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'flex-start', 
                            height: '100%', 
                            padding: isMobile ? '2px 1px' : '4px 2px',
                            fontSize: isMobile ? '7px' : '9px'
                          }}>
                            {/* Day number */}
                            <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 'bold', marginBottom: 2 }}>
                              {displayText}
                            </div>
                            
                            {/* Top 3 locations */}
                            {topLocations.slice(0, isMobile ? 2 : 3).map((tl, idx) => {
                              const friendlyName = getFriendlyLocationName(tl.location, person.attributes.friendly_name, zones);
                              const locationTypeForIcon = getLocationTypeFromName(tl.location, person.attributes.friendly_name, zones);
                              const shortName = isMobile ? 
                                (friendlyName.length > 5 ? friendlyName.substring(0, 5) + '..' : friendlyName) :
                                (friendlyName.length > 7 ? friendlyName.substring(0, 7) + '...' : friendlyName);
                              
                              return (
                                <div key={idx} style={{ 
                                  fontSize: isMobile ? 7 : 8, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1,
                                  marginBottom: 1,
                                  opacity: idx === 0 ? 1 : 0.8 - (idx * 0.2)
                                }}>
                                  <span style={{ fontSize: isMobile ? 8 : 9 }}>{getLocationIcon(locationTypeForIcon)}</span>
                                  <span style={{ fontSize: isMobile ? 7 : 8 }}>{shortName}</span>
                                  <span style={{ fontSize: isMobile ? 6 : 7, fontWeight: 'bold' }}>({tl.percentage}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const now = dayjs();
  const [persons, setPersons] = useState([]);
  const [zones, setZones] = useState([]);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('');
  const [currentDate, setCurrentDate] = useState(now);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDataForMonth = async (date, personsData) => {
    const start = date.startOf('month').format('YYYY-MM-DDT00:00:00');
    const end = date.endOf('month').format('YYYY-MM-DDT23:59:59');
    const dataObj = {};
    
    for (const person of personsData) {
      const resp = await axios.get(`${API_BASE}/history`, {
        params: {
          entity_id: person.entity_id,
          start,
          end
        }
      });
      // Parse history (now [{date, state, top_locations}, ...])
      const history = resp.data || [];
      const dayLoc = {};
      history.forEach(event => {
        dayLoc[event.date] = {
          state: event.state,
          topLocations: event.top_locations || []
        };
      });
      dataObj[person.entity_id] = dayLoc;
    }
    return dataObj;
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [pRes, zRes] = await Promise.all([
        axios.get(`${API_BASE}/persons`),
        axios.get(`${API_BASE}/zones`)
      ]);
      setPersons(pRes.data);
      setZones(zRes.data);
      // Set default user (JP if present, else first)
      const jp = pRes.data.find(p => (p.attributes.friendly_name || '').toLowerCase() === 'jp');
      setSelectedUser(jp ? jp.entity_id : (pRes.data[0]?.entity_id || ''));
      
      // Fetch history for current month
      const monthData = await fetchDataForMonth(currentDate, pRes.data);
      setData(monthData);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleMonthChange = async (direction) => {
    const newDate = direction === 'prev' ? currentDate.subtract(1, 'month') : currentDate.add(1, 'month');
    setCurrentDate(newDate);
    setLoading(true);
    
    // Fetch data for new month
    const monthData = await fetchDataForMonth(newDate, persons);
    setData(monthData);
    setLoading(false);
  };

  const handleUserChange = (e) => setSelectedUser(e.target.value);
  const filteredPersons = persons.filter(p => p.entity_id === selectedUser);

  return (
    <div style={{ 
      padding: isMobile ? 5 : 10, 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      <div style={{ 
        width: '100%',
        height: '100%',
        margin: 0,
        background: 'white',
        borderRadius: isMobile ? 8 : 12,
        padding: isMobile ? 10 : 15,
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          margin: '0 0 10px 0', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: isMobile ? 20 : 28,
          fontWeight: 'bold',
          flexShrink: 0
        }}>
          🏠 Calendrier de Présence
        </h1>
        
        {!loading && (
          <div style={{ 
            marginBottom: 10, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: isMobile ? 'column' : 'row',
            background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
            padding: isMobile ? 8 : 12,
            borderRadius: 8,
            border: '1px solid #90caf9',
            gap: isMobile ? 8 : 0,
            flexShrink: 0
          }}>
            <label htmlFor="user-select" style={{ 
              fontWeight: 'bold', 
              marginRight: isMobile ? 0 : 12, 
              fontSize: isMobile ? 12 : 14,
              color: '#1565c0'
            }}>
              👤 Utilisateur :
            </label>
            <select 
              id="user-select" 
              value={selectedUser} 
              onChange={handleUserChange}
              style={{
                padding: isMobile ? '6px 10px' : '8px 12px',
                borderRadius: 6,
                border: '2px solid #90caf9',
                fontSize: isMobile ? 11 : 13,
                background: 'white',
                cursor: 'pointer',
                minWidth: isMobile ? 120 : 160
              }}
            >
              {persons.map(person => (
                <option key={person.entity_id} value={person.entity_id}>
                  {person.attributes.friendly_name || person.entity_id}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: isMobile ? 20 : 30,
            fontSize: isMobile ? 14 : 16,
            color: '#666',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ marginBottom: 15, fontSize: isMobile ? 30 : 40 }}>⏳</div>
            Chargement des données...
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <Calendar 
              persons={filteredPersons} 
              zones={zones} 
              data={data} 
              year={currentDate.year()} 
              month={currentDate.month()+1}
              onMonthChange={handleMonthChange}
            />
          </div>
        )}
        
        {!loading && (
          <div style={{
            marginTop: isMobile ? 8 : 12,
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 8 : 12,
            flexShrink: 0
          }}>
            {/* Legend */}
            <div style={{
              padding: isMobile ? 8 : 12,
              background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
              borderRadius: 6,
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                color: '#495057', 
                textAlign: 'center',
                fontSize: isMobile ? 12 : 14
              }}>
                📍 Légende
              </h3>
              <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 4 : 8,
                justifyContent: 'space-around'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  padding: isMobile ? '3px 6px' : '4px 8px',
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #a8e6cf, #88d8a3)',
                  color: '#2d5a41',
                  fontWeight: 'bold',
                  fontSize: isMobile ? 9 : 11
                }}>
                  🏠 Maison
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  padding: isMobile ? '3px 6px' : '4px 8px',
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #a8d5ff, #7bb8ff)',
                  color: '#1e3a5f',
                  fontWeight: 'bold',
                  fontSize: isMobile ? 9 : 11
                }}>
                  🏢 Bureau
                </div>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4,
                  padding: isMobile ? '3px 6px' : '4px 8px',
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #ffd3a5, #ffa474)',
                  color: '#7d4a1a',
                  fontWeight: 'bold',
                  fontSize: isMobile ? 9 : 11
                }}>
                  📍 Autre lieu
                </div>
              </div>
            </div>

            {/* Statistics */}
            {filteredPersons.length > 0 && (
              <div style={{
                padding: isMobile ? 8 : 12,
                background: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)',
                borderRadius: 6,
                border: '1px solid #a5d6a7'
              }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#2e7d32', 
                  textAlign: 'center',
                  fontSize: isMobile ? 12 : 14
                }}>
                  📊 Statistiques du mois
                </h3>
                {(() => {
                  const person = filteredPersons[0];
                  const monthData = data[person.entity_id] || {};
                  const totalDays = Object.keys(monthData).length;
                  
                  let homeDays = 0;
                  let officeDays = 0;
                  let otherDays = 0;
                  
                  Object.values(monthData).forEach(dayData => {
                    if (dayData.topLocations && dayData.topLocations.length > 0) {
                      const mainLocation = dayData.topLocations[0].location;
                      if (mainLocation === 'home') {
                        homeDays++;
                      } else if (mainLocation === 'office' || 
                        (person.attributes.friendly_name?.toLowerCase() === 'jp' && 
                         mainLocation?.toLowerCase().includes('boulot'))) {
                        officeDays++;
                      } else {
                        otherDays++;
                      }
                    }
                  });

                  return (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 4,
                      fontSize: isMobile ? 10 : 12
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>🏠 Maison:</span>
                        <strong>{homeDays}j</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>🏢 Bureau:</span>
                        <strong>{officeDays}j</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span>📍 Autres:</span>
                        <strong>{otherDays}j</strong>
                      </div>
                      <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #a5d6a7' }} />
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: '2px 0', 
                        fontSize: isMobile ? 11 : 13, 
                        fontWeight: 'bold' 
                      }}>
                        <span>📅 Total:</span>
                        <strong>{totalDays}j</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
