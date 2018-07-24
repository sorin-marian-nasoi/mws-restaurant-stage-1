importScripts('js/idb.js');
importScripts('js/dbhelper.js');

var staticCacheName = 'mws-v1';
var contentImgsCache = 'mws-images';
var allCaches = [staticCacheName, contentImgsCache];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(staticCacheName).then(function (cache) {
    return cache.addAll(
      [
        '/',
        'js/idb.js',
        'js/dbhelper.js',
        'js/main.js',
        'js/restaurant_info.js'
      ]);
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.filter(function (cacheName) {
      return cacheName.startsWith('mws-') && !allCaches.includes(cacheName);
    }).map(function (cacheName) {
      return caches['delete'](cacheName);
    }));
  }));
});

self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);

  // Let the browser do its default thing for non-GET requests
  if (event.request.method != 'GET') return;

  if (requestUrl.origin === location.origin) {
    if (requestUrl.pathname === '/') {
      event.respondWith(caches.match(event.request));
      return;
    }
    if (requestUrl.pathname.startsWith('/images/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
  } else if (requestUrl.origin === "https://maps.googleapis.com") {
    event.respondWith(serveMap(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});


self.addEventListener('sync', function(event) {
  // get reviews from IDB
  //update the DB for every IDB review

  if (event.tag == 'reviewDBSync') {
    event.waitUntil(DBHelper.fetchReviews((error, reviews) => {
      if (error) { // Got an error
        console.error(error);
      }
      console.log('reviews', reviews);
    }));
  }
});

/**
 * Post review in database only when there is connectivity.
 */
function postData (url = '', data = {}) {
  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify(data),
  };
  return fetch(url, init)
    .then(response => response.json()) // parses response to JSON
    .catch(error => console.error(`Fetch Error ${error}\n`));
}

function servePhoto(request) {
  var storageUrl = request.url;

  return caches.open(contentImgsCache).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) return response;

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

function serveMap(request) {
  var storageUrl = request.url;

  return caches.open(staticCacheName).then(function (cache) {
    return cache.match(storageUrl).then(function (response) {
      if (response) return response;

      return fetch(request).then(function (networkResponse) {
        cache.put(storageUrl, networkResponse.clone());
        return networkResponse;
      });
    });
  });
}

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
