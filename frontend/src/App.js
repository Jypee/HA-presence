import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';

dayjs.locale('fr');

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
const getLocationStyle = (locationType, isCurrentDay = false, screenSize = {}) => {
  const isMobile = screenSize.width < 768;
  const isSmallMobile = screenSize.width < 480;
  
  const baseStyle = {
    textAlign: 'center',
    height: isSmallMobile ? 100 : isMobile ? 120 : 140, // Responsive height
    border: '1px solid #ddd',
    fontSize: isSmallMobile ? '10px' : isMobile ? '11px' : '12px', // Responsive font size
    fontWeight: isCurrentDay ? 'bold' : 'normal',
    boxShadow: isCurrentDay ? '0 0 5px rgba(0,123,255,0.5)' : 'none',
    position: 'relative',
    padding: isSmallMobile ? '3px' : isMobile ? '4px' : '6px' // Responsive padding
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

// Modal component for detailed day view
function DayDetailModal({ isOpen, onClose, dayData, date, personName, zones, isMobile }) {
  if (!isOpen) return null;

  const formatTimeRange = (start, end) => {
    return `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`;
  };

  const totalDuration = dayData?.top_locations?.reduce((acc, loc) => acc + (loc.duration || 0), 0) || 0;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: isMobile ? 5 : 20
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: 12,
        padding: isMobile ? 20 : 25,
        maxWidth: isMobile ? '98%' : '700px',
        width: '100%',
        maxHeight: isMobile ? '95%' : '85%',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          borderBottom: '2px solid #e9ecef',
          paddingBottom: 15
        }}>
          <h2 style={{
            margin: 0,
            color: '#495057',
            fontSize: isMobile ? 20 : 24
          }}>
            📅 {dayjs(date).format('dddd DD MMMM YYYY')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 50,
              width: isMobile ? 35 : 30,
              height: isMobile ? 35 : 30,
              cursor: 'pointer',
              fontSize: isMobile ? 18 : 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#6c757d', marginBottom: 10, fontSize: isMobile ? 16 : 18 }}>
            👤 {personName}
          </h3>
        </div>

        {dayData?.top_locations && dayData.top_locations.length > 0 ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ color: '#495057', marginBottom: 15, fontSize: isMobile ? 16 : 18 }}>
                📍 Répartition de la présence (heures de travail 9h-18h)
              </h4>
              
              {/* Visual timeline */}
              <div style={{
                background: '#f8f9fa',
                borderRadius: 8,
                padding: isMobile ? 12 : 15,
                marginBottom: 15
              }}>
                <div style={{
                  display: 'flex',
                  height: isMobile ? 50 : 40,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: '1px solid #dee2e6'
                }}>
                  {dayData.top_locations.map((location, idx) => {
                    const locationType = getLocationTypeFromName(location.location, personName, zones);
                    const color = locationType === 'home' ? '#88d8a3' : 
                                 locationType === 'office' ? '#7bb8ff' : '#ffa474';
                    
                    return (
                      <div
                        key={idx}
                        style={{
                          width: `${location.percentage}%`,
                          backgroundColor: color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: isMobile ? 12 : 12,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                        }}
                        title={`${getFriendlyLocationName(location.location, personName, zones)}: ${location.percentage}%`}
                      >
                        {location.percentage > 12 ? `${location.percentage.toFixed(0)}%` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dayData.top_locations.map((location, idx) => {
                  const locationType = getLocationTypeFromName(location.location, personName, zones);
                  const friendlyName = getFriendlyLocationName(location.location, personName, zones);
                  const icon = getLocationIcon(locationType);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? 15 : 12,
                        borderRadius: 8,
                        background: idx === 0 ? 'linear-gradient(135deg, #e3f2fd, #bbdefb)' : '#f8f9fa',
                        border: `1px solid ${idx === 0 ? '#90caf9' : '#dee2e6'}`,
                        fontSize: isMobile ? 14 : 14
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: isMobile ? 20 : 18 }}>{icon}</span>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#495057' }}>
                            {friendlyName}
                          </div>
                          <div style={{ fontSize: isMobile ? 12 : 12, color: '#6c757d' }}>
                            {location.count} événement{location.count > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          fontWeight: 'bold', 
                          fontSize: isMobile ? 16 : 16,
                          color: idx === 0 ? '#1565c0' : '#495057'
                        }}>
                          {location.percentage.toFixed(1)}%
                        </div>
                        {location.duration && (
                          <div style={{ fontSize: isMobile ? 12 : 12, color: '#6c757d' }}>
                            ~{Math.round(location.duration / 60)}h {Math.round(location.duration % 60)}min
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)',
              borderRadius: 8,
              padding: isMobile ? 18 : 15,
              border: '1px solid #a5d6a7'
            }}>
              <h4 style={{ color: '#2e7d32', marginBottom: 10, fontSize: isMobile ? 16 : 16 }}>
                📊 Résumé
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
                gap: isMobile ? 8 : 10, 
                fontSize: isMobile ? 14 : 14 
              }}>
                <div>
                  <strong>Lieu principal:</strong><br />
                  {getFriendlyLocationName(dayData.top_locations[0]?.location, personName, zones)}
                </div>
                <div>
                  <strong>Temps principal:</strong><br />
                  {dayData.top_locations[0]?.percentage.toFixed(1)}% de la journée
                </div>
                <div>
                  <strong>Nombre de lieux:</strong><br />
                  {dayData.top_locations.length} lieu{dayData.top_locations.length > 1 ? 'x' : ''}
                </div>
                <div>
                  <strong>Événements total:</strong><br />
                  {dayData.top_locations.reduce((acc, loc) => acc + loc.count, 0)}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? 50 : 40,
            color: '#6c757d',
            fontSize: isMobile ? 16 : 16
          }}>
            <div style={{ fontSize: isMobile ? 50 : 40, marginBottom: 15 }}>❓</div>
            Aucune donnée de présence disponible pour cette journée
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Determine device type based on screen size
  const isMobile = screenSize.width < 768;
  const isTablet = screenSize.width >= 768 && screenSize.width < 1024;
  const isSmallMobile = screenSize.width < 480;
  
  // Update screen size on resize
  useEffect(() => {
    const handleResize = () => setScreenSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
    
    // Initial detection
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDayClick = (date, dayData, personName) => {
    if (dayData && dayData.top_locations && dayData.top_locations.length > 0) {
      setSelectedDay({ date: date.format('YYYY-MM-DD'), dayData, personName });
      setModalOpen(true);
    }
  };
  
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
                      if (!d) return <td key={i} style={{ 
                        background: '#f8f9fa', 
                        height: isSmallMobile ? 100 : isMobile ? 120 : 140, 
                        border: '1px solid #dee2e6' 
                      }} />;
                      
                      const isCurrentDay = d.format('YYYY-MM-DD') === today.format('YYYY-MM-DD');
                      const dayData = data?.[person.entity_id]?.[d.format('YYYY-MM-DD')];
                      const loc = dayData?.state || '';
                      const topLocations = dayData?.top_locations || [];
                      
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
                      
                      const cellStyle = getLocationStyle(locationType, isCurrentDay, screenSize);
                      
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
                            cursor: (dayData && dayData.top_locations && dayData.top_locations.length > 0) ? 'pointer' : 'default',
                            transition: 'all 0.3s ease'
                          }}
                          title={tooltipText}
                          onClick={() => handleDayClick(d, dayData, person.attributes.friendly_name)}
                          onMouseOver={(e) => {
                            if (!isMobile && dayData && dayData.top_locations && dayData.top_locations.length > 0) {
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
                            padding: isSmallMobile ? '3px 1px' : isMobile ? '4px 2px' : '6px 3px',
                            fontSize: isSmallMobile ? '8px' : isMobile ? '9px' : '10px'
                          }}>
                            {/* Day number */}
                            <div style={{ 
                              fontSize: isSmallMobile ? 14 : isMobile ? 16 : 18, 
                              fontWeight: 'bold', 
                              marginBottom: isSmallMobile ? 2 : 4 
                            }}>
                              {displayText}
                              {dayData && dayData.top_locations && dayData.top_locations.length > 0 && (
                                <span style={{ 
                                  fontSize: isSmallMobile ? 8 : isMobile ? 10 : 12, 
                                  marginLeft: 3, 
                                  color: 'rgba(0,0,0,0.6)',
                                  cursor: 'pointer' 
                                }}>
                                  🔍
                                </span>
                              )}
                            </div>
                            
                            {/* Top locations */}
                            {topLocations.slice(0, isSmallMobile ? 2 : isMobile ? 3 : 4).map((tl, idx) => {
                              const friendlyName = getFriendlyLocationName(tl.location, person.attributes.friendly_name, zones);
                              const locationTypeForIcon = getLocationTypeFromName(tl.location, person.attributes.friendly_name, zones);
                              const maxLength = isSmallMobile ? 6 : isMobile ? 8 : 10;
                              const shortName = friendlyName.length > maxLength ? 
                                friendlyName.substring(0, maxLength) + '..' : friendlyName;
                              
                              return (
                                <div key={idx} style={{ 
                                  fontSize: isSmallMobile ? 7 : isMobile ? 9 : 10, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 2,
                                  marginBottom: isSmallMobile ? 1 : isMobile ? 2 : 1,
                                  opacity: idx === 0 ? 1 : 0.9 - (idx * 0.15),
                                  flexWrap: 'wrap',
                                  justifyContent: 'center',
                                  width: '100%'
                                }}>
                                  <span style={{ fontSize: isSmallMobile ? 8 : isMobile ? 10 : 11 }}>
                                    {getLocationIcon(locationTypeForIcon)}
                                  </span>
                                  <span style={{ 
                                    fontSize: isSmallMobile ? 6 : isMobile ? 8 : 9,
                                    textAlign: 'center',
                                    lineHeight: 1.1
                                  }}>{shortName}</span>
                                  <span style={{ 
                                    fontSize: isSmallMobile ? 6 : isMobile ? 8 : 9, 
                                    fontWeight: 'bold',
                                    color: idx === 0 ? '#1565c0' : 'inherit'
                                  }}>({tl.percentage.toFixed(0)}%)</span>
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
      
      {/* Day Detail Modal */}
      {selectedDay && (
        <DayDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          dayData={selectedDay.dayData}
          date={selectedDay.date}
          personName={selectedDay.personName}
          zones={zones}
          isMobile={isMobile}
        />
      )}
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
          top_locations: event.top_locations || []
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
            textAlign: 'center',
            fontSize: isMobile ? 11 : 13,
            color: '#6c757d',
            marginBottom: 10,
            padding: isMobile ? '5px' : '8px',
            background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
            borderRadius: 6,
            border: '1px solid #ffc107',
            flexShrink: 0
          }}>
            💡 <strong>Astuce:</strong> Cliquez sur un jour avec des données (🔍) pour voir les détails de présence
          </div>
        )}
        
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
                    if (dayData.top_locations && dayData.top_locations.length > 0) {
                      const mainLocation = dayData.top_locations[0].location;
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
