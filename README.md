# MoveWise 🏙️

A city relocation assistant that helps you find similar places in your new city based on your favorite spots from your current city.

## 📱 Download App

[**Download Android APK**](https://expo.dev/accounts/shreyansh44/projects/MoveWise/builds/bb50916c-8f71-443c-a0d4-75078f0c5e72)

---

## 🌟 Features

- Find similar gyms, restaurants, cafes, and more in your target city
- Top 5 results per category ranked by rating
- Google Maps integration to view places
- Redis geo-caching to avoid redundant API calls
- Concurrent API fetching for multiple place categories

---

## 🏗️ Architecture

```
React Native (Expo)
        │
        ▼
Spring Boot Backend (Render)
        │
   ┌────┴────┐
   ▼         ▼
Redis     MongoDB Atlas
(Cache)   (Persistence)
        │
        ▼
RapidAPI → Google Places API
```

**Flow:**
1. User selects their current city's favorite places and target city
2. Backend deduplicates place types and checks Redis geo-cache
3. Cache miss → fetches from Google Places API concurrently via `Flux.merge`
4. Results cached in Redis + persisted in MongoDB for future requests
5. Top 5 places per category returned ranked by rating

---

## 🛠️ Tech Stack

### Backend
- **Java 17** + **Spring Boot 3.2**
- **Spring WebFlux** (WebClient + Reactor for concurrent API calls)
- **MongoDB Atlas** — place data persistence
- **Redis Cloud** — geo-spatial caching (`GEORADIUS` queries)
- **RapidAPI** — Google Places API proxy
- **Docker** — containerized deployment on Render

### Frontend
- **React Native** + **Expo Router**
- **Google Maps SDK** — place visualization
- **EAS Build** — Android APK distribution

---

## 🚀 Running Locally

### Prerequisites
- Java 17+
- Docker (for Redis locally) or a Redis Cloud instance
- MongoDB Atlas account
- RapidAPI key for [Google Map Places](https://rapidapi.com/hub)

### Backend

1. Clone the repo:
```bash
git clone https://github.com/yourusername/MoveWise.git
cd MoveWise/BackendApp
```

2. Set environment variables (create a `.env` or set in your IDE):
```
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
REDIS_HOST=your_redis_host
REDIS_PORT=your_redis_port
REDIS_PASSWORD=your_redis_password
GMAPS_URL=https://google-map-places.p.rapidapi.com/maps/api/
RAPID_API_KEY=your_rapidapi_key
SPRING_PROFILES_ACTIVE=dev
```

3. Run:
```bash
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8050`

### Frontend

```bash
cd Frontend
npm install
npx expo start
```

Scan the QR code with Expo Go app on your phone.

---

## 📡 API Reference

### `POST /api/relocate`

Find similar places in a new city.

**Request:**
```json
{
  "previous_city": {
    "name": "Delhi",
    "coordinates": { "lat": 28.6139, "lng": 77.2090 }
  },
  "current_city": {
    "name": "Mumbai",
    "coordinates": { "lat": 19.0760, "lng": 72.8777 }
  },
  "source_places": [
    {
      "type": "gym",
      "name": "My Gym",
      "coordinates": { "lat": 28.6139, "lng": 77.2090 }
    },
    {
      "type": "restaurant",
      "name": "My Restaurant",
      "coordinates": { "lat": 28.6200, "lng": 77.2100 }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "name": "Gold's Gym",
      "type": "gym",
      "rating": 4.4,
      "address": "RDC, Raj Nagar, Mumbai",
      "coordinatesDto": {
        "lat": 19.0760,
        "lng": 72.8777
      }
    }
  ]
}
```

### `GET /api/relocate/health`

Health check — returns `200 OK` with `"Backend is up and running"`.

---

## ☁️ Deployment

### Backend (Render)
- Dockerfile in `BackendApp/`
- Set `SPRING_PROFILES_ACTIVE=prod` in Render environment variables
- All other secrets set as env vars in Render dashboard

### Frontend (EAS Build)
```bash
eas build -p android --profile preview
```

---

## 📁 Project Structure

```
MoveWise/
├── BackendApp/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       └── main/
│           ├── java/com/Backend/BackendApp/
│           │   ├── Config/          # Redis, WebClient, CORS
│           │   ├── Controller/      # REST endpoints
│           │   ├── Dto/             # Request/Response models
│           │   ├── Entity/          # MongoDB documents
│           │   ├── Repository/      # MongoDB repositories
│           │   └── Service/         # Business logic
│           └── resources/
│               ├── application.yml
│               ├── application-dev.yml
│               └── application-prod.yml
└── Frontend/
    ├── app/
    │   ├── index.tsx
    │   ├── frequent-places.tsx
    │   ├── TargetCity.tsx
    │   └── recommendations.tsx
    ├── app.json
    └── eas.json
```

---

## 🔒 Security Notes

- All secrets managed via environment variables
- Never commit `application-dev.yml` with real credentials
- MongoDB Atlas IP whitelisted to `0.0.0.0/0` for dynamic cloud IPs
