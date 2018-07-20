let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
  DBHelper.fetchReviews((error, reviews) => {
    if (error) { // Got an error
      console.error(error);
    }
  });
  registerServiceWorker();
});

/**
 * Initialize Google map when button is clicked.
 */
document.getElementById("loadMap-button").addEventListener("click", function( event ) {
  // display the current click count inside the clicked div
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}, false);

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  /* add everithing inside a inside a div with id restaurantDetails */
  const divRestaurantDetails = document.createElement('div');
  divRestaurantDetails.className = "restaurantDetails";

  /* add the restaurant info inside a div */
  const divName = document.createElement('div');
  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  divName.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  divName.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  divName.append(address);
  divRestaurantDetails.append(divName);

  /* add the image inside a div */
  const divImage = document.createElement('div');
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  if(lazyLoad){
    image.setAttribute('data-src',DBHelper.smallImageUrlForRestaurant(restaurant));
  } else {
    image.src = DBHelper.smallImageUrlForRestaurant(restaurant);
  }
  image.alt = `Image of restaurant ${restaurant.name}`;
  image.title = restaurant.name;
  divImage.append(image);
  divRestaurantDetails.append(divImage);

  /* add the details link inside a div */
  const divDetails = document.createElement('div');
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.alt = restaurant.name;
  divDetails.append(more);
  divRestaurantDetails.append(divDetails);

  li.append(divRestaurantDetails);

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

/**
 * Register service worker
 */
registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    console.log('The current browser doesn\'t support service workers');
    return;
  }

  navigator.serviceWorker.register('/sw.js').then(function (registration) {
    var serviceWorker;
    if (registration.installing) {
      serviceWorker = registration.installing;
      //console.console.log("SW status: installing");
    } else if (registration.waiting) {
      serviceWorker = registration.waiting;
      //console.log("SW status: waiting");
    } else if (registration.active) {
      serviceWorker = registration.active;
      //console.log("SW status: active");
    }
    if (serviceWorker) {
      //console.log('SW state: ', serviceWorker.state);
      serviceWorker.addEventListener('statechange', function (e) {
        console.log('SW state changed: ', e.target.state);
      });
    }
  }).catch (function (error) {
    // Something went wrong during registration. The sw.js file
    // might be unavailable or contain a syntax error.
    console.log('SW registration failed');
  });

  // Ensure refresh is only called once.
  // This works around a bug in "force update on reload".
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
}
