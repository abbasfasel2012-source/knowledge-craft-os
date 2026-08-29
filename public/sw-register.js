if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.log("Service Worker registration failed:", error);
    });
  });

  // Handle service worker updates
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("Service Worker updated, app will refresh");
    window.location.reload();
  });
}

// Enable offline mode indicator
window.addEventListener("offline", () => {
  document.body.classList.add("offline");
});

window.addEventListener("online", () => {
  document.body.classList.remove("offline");
});

// Request notification permission
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
