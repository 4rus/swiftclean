// ─────────────────────────────────────────────────────────────────────
// INDIMOE Cleaning — Store Locations
// GPS coordinates for each store (used for location-based login)
// Radius: employee must be within GPS_RADIUS_METRES to log in
// ─────────────────────────────────────────────────────────────────────

export const GPS_RADIUS_METRES = 100  // adjust if needed (200m is ~2 city blocks)

export const STORES = [
  { id: 1, name: 'Swiss Chalet - Country Hills', address: '508 Country Village Way NE, Calgary, AB T3K 0R2',      lat: 51.1554, lng: -114.0605 },
  { id: 2, name: 'Bahubali',                     address: '6520 36 St NE Unit - 1120, Calgary, AB T3J 4C8',       lat: 51.0848, lng: -113.9760 },
  { id: 3, name: 'Explode The Dessert Cafe',      address: '4715 88 Ave NE #1105, Calgary, AB T3J 4E4',           lat: 51.0912, lng: -113.9632 },
  { id: 4, name: 'Mumbaayai Pure Veg',            address: '4100 109 Ave NE unit 3120, Calgary, AB T3N 2J1',      lat: 51.1234, lng: -113.9581 },
  { id: 5, name: 'Lovely Sweet - Savanna',        address: '30 Savanna Cres NE #1110, Calgary, AB T3J 2E9',       lat: 51.1050, lng: -113.9700 },
  { id: 6, name: 'Lovely Sweet - Skyview',        address: '6004 Country Hills Blvd NE #1860, Calgary, AB T3N 1K8', lat: 51.1480, lng: -114.0015 },
  { id: 7, name: 'Lovely Sweet - Redstone',       address: '235 Red Embers Way NE #3110, Calgary, AB T3N 1E9',    lat: 51.1667, lng: -113.9566 },
]

// Haversine formula — returns distance in metres between two GPS points
export function getDistanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = d => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Returns the nearest store and distance, or null if none within radius
export function getNearestStore(userLat, userLng) {
  let nearest = null
  let minDist = Infinity
  for (const store of STORES) {
    const dist = getDistanceMetres(userLat, userLng, store.lat, store.lng)
    if (dist < minDist) {
      minDist = dist
      nearest = { ...store, distance: Math.round(dist) }
    }
  }
  if (minDist <= GPS_RADIUS_METRES) return nearest
  return { nearest, distance: Math.round(minDist), tooFar: true }
}
