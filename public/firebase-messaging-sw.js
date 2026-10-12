// Shows Smartrack alerts as system notifications while the tab is closed or in
// the background. Firebase displays each push itself; this file only has to
// start Firebase Messaging and decide what a click on a notification opens.
// A service worker cannot read the app's env, so the (public) web config from
// src/lib/firebase.ts is repeated here. Keep the two in sync.

// Registered before Firebase so it runs first: open the delivery the alert is about
self.addEventListener('notificationclick', (event) => {
  const tripId = event.notification.data?.FCM_MSG?.data?.tripId
  event.notification.close()
  event.waitUntil(self.clients.openWindow(tripId ? `/admin/track/${tripId}` : '/admin'))
})

importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/13.0.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyCCvi99Im7xiB-s-ILVl6fUbnOIzpNOG78',
  authDomain: 'smartrack-c5ab3.firebaseapp.com',
  projectId: 'smartrack-c5ab3',
  storageBucket: 'smartrack-c5ab3.firebasestorage.app',
  messagingSenderId: '1027945739145',
  appId: '1:1027945739145:web:04dc721c29a1cbf3b02758',
  measurementId: 'G-XJFNSJGXKS',
})
firebase.messaging()
