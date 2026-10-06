let IS_PROD = false;

const server = IS_PROD
    ? "YOUR_SYNCMEET_BACKEND_URL"
    : "http://localhost:8000";

export default server;