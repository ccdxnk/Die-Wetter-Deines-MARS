"use strict";

const form = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const suggestionsEl = document.getElementById("suggestions");
const currentWeatherCard = document.getElementById("current-weather");
const forecastCard = document.getElementById("forecast");
const dailyForecastCard = document.getElementById("daily-forecast");
const locationNameEl = document.getElementById("location-name");
const tempEl = document.getElementById("temperature");
const weatherDescEl = document.getElementById("weather-description");
const forecastListEl = document.getElementById("forecast-list");
const dailyListEl = document.getElementById("daily-list");
const detailCard = document.getElementById("detail-card");
const detailTitleEl = document.getElementById("detail-title");
const detailInfoEl = document.getElementById("detail-info");

/* Utils */
const showElement = (el) => el.classList.remove("hidden");
const hideElement = (el) => el.classList.add("hidden");
const weatherCodeMap = {
  0: { text: "Klar", emoji: "☀️" },
  1: { text: "Größtenteils klar", emoji: "🌤️" },
  2: { text: "Teilweise bewölkt", emoji: "⛅" },
  3: { text: "Bewölkt", emoji: "☁️" },
  45: { text: "Nebel", emoji: "🌫️" },
  48: { text: "Reifnebel", emoji: "🌫️" },
  51: { text: "Leichter Nieselregen", emoji: "🌦️" },
  53: { text: "Nieselregen", emoji: "🌦️" },
  55: { text: "Starker Nieselregen", emoji: "🌧️" },
  61: { text: "Leichter Regen", emoji: "🌦️" },
  63: { text: "Regen", emoji: "🌧️" },
  65: { text: "Starker Regen", emoji: "🌧️" },
  71: { text: "Leichter Schneefall", emoji: "🌨️" },
  73: { text: "Schneefall", emoji: "🌨️" },
  75: { text: "Starker Schneefall", emoji: "❄️" },
  80: { text: "Regenschauer", emoji: "🌦️" },
  81: { text: "Starke Schauer", emoji: "🌧️" },
  82: { text: "Heftige Schauer", emoji: "⛈️" },
  95: { text: "Gewitter", emoji: "⛈️" },
  96: { text: "Gewitter mit Hagel", emoji: "⛈️" },
  99: { text: "Schweres Gewitter mit Hagel", emoji: "⛈️" },
};

const getSymbol = (code) => weatherCodeMap[code] || { text: "", emoji: "" };

const formatHour = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
};

/* Fetch coordinates from Open-Meteo Geocoding API */
async function getCoordinates(city, limit = 5) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city
  )}&count=${limit}&language=de&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding fehlgeschlagen");
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("Stadt nicht gefunden");
  return data.results.map(({ latitude, longitude, name, country }) => ({ latitude, longitude, name, country }));
}

/* Fetch weather forecast */
async function getWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=Europe%2FBerlin`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Wetterdaten konnten nicht geladen werden");
  return res.json();
}

/* Render current weather */
function renderCurrentWeather(location, weather) {
  locationNameEl.textContent = `${location.name}, ${location.country}`;
  tempEl.textContent = Math.round(weather.current_weather.temperature);
  const currentSymbol = getSymbol(weather.current_weather.weathercode);
  weatherDescEl.textContent = `${currentSymbol.emoji} ${currentSymbol.text} – Stand: ${new Date(
    weather.current_weather.time
  ).toLocaleString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  showElement(currentWeatherCard);
}

/* Render 24-h forecast */
function renderForecast(weather) {
  forecastListEl.innerHTML = "";
  const now = new Date(weather.current_weather.time);
  const startIndex = weather.hourly.time.findIndex((t) => new Date(t) >= now);

  const sliceEnd = startIndex + 24;
  for (let i = startIndex; i < sliceEnd && i < weather.hourly.time.length; i++) {
    const time = formatHour(weather.hourly.time[i]);
    const temp = Math.round(weather.hourly.temperature_2m[i]);
    const li = document.createElement("li");
    const symbol = getSymbol(weather.hourly.weathercode[i]);
    li.innerHTML = `<span>${time}</span><span>${symbol.emoji} ${temp}°C</span>`;
    li.addEventListener("click", () => showDetail(`${time}`, `${symbol.emoji} ${temp}°C`));
    forecastListEl.appendChild(li);
  }
  showElement(forecastCard);
}

/* Render 7-day forecast */
function renderDailyForecast(weather) {
  dailyListEl.innerHTML = "";
  const days = weather.daily.time.length;
  for (let i = 0; i < days; i++) {
    const dateStr = new Date(weather.daily.time[i]).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
    const max = Math.round(weather.daily.temperature_2m_max[i]);
    const min = Math.round(weather.daily.temperature_2m_min[i]);
    const li = document.createElement("li");
    const symbol = getSymbol(weather.daily.weathercode[i]);
    li.innerHTML = `<span>${dateStr}</span><span>${symbol.emoji} ${min}°C / ${max}°C</span>`;
    li.addEventListener("click", () => showDetail(`${dateStr}`, `${symbol.emoji} Min ${min}°C / Max ${max}°C`));
    dailyListEl.appendChild(li);
  }
  showElement(dailyForecastCard);
}

/* Show detail card */
function showDetail(title, info) {
  detailTitleEl.textContent = title;
  detailInfoEl.textContent = info;
  showElement(detailCard);
}

/* Show suggestions list */
function showSuggestions(results) {
  suggestionsEl.innerHTML = "";
  results.forEach((loc) => {
    const li = document.createElement("li");
    li.textContent = `${loc.name}, ${loc.country}`;
    li.addEventListener("click", async () => {
      hideElement(suggestionsEl);
      try {
        const weather = await getWeather(loc.latitude, loc.longitude);
        renderCurrentWeather(loc, weather);
        renderForecast(weather);
        renderDailyForecast(weather);
      } catch (err) {
        alert(err.message);
      }
    });
    suggestionsEl.appendChild(li);
  });
  showElement(suggestionsEl);
}

/* Handle submit */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;

  try {
    form.querySelector("button").disabled = true;

    const results = await getCoordinates(city);

    if (results.length > 1) {
      showSuggestions(results);
      return; // wait for user selection
    }
    const location = results[0];
    const weather = await getWeather(location.latitude, location.longitude);

    renderCurrentWeather(location, weather);
    renderForecast(weather);
    renderDailyForecast(weather);
  } catch (err) {
    alert(err.message);
    hideElement(currentWeatherCard);
    hideElement(forecastCard);
    hideElement(dailyForecastCard);
    hideElement(detailCard);
    hideElement(suggestionsEl);
  } finally {
    form.querySelector("button").disabled = false;
  }
});
