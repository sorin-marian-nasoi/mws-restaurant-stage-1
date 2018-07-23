let restaurant,
  reviews,
  form
var map2;

document.addEventListener('DOMContentLoaded', (event) => {
  initReviewForm();
  initFormInputs();
  getReviewsFromIDB();

  registerServiceWorker();
})

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
    }
  });
}

/**
 * Initialize Google map when button is clicked.
 */
document.getElementById("loadMap2-button").addEventListener("click", function( event ) {
  // display the current click count inside the clicked div
  self.map2 = new google.maps.Map(document.getElementById('map2'), {
    zoom: 16,
    center: self.restaurant.latlng,
    scrollwheel: false
  });
  DBHelper.mapMarkerForRestaurant(self.restaurant, self.map2);
}, false)

/**
 * Get the restaurant reviews from IndexDB.
 */
getReviewsFromIDB = () => {
  const id = getParameterByName('id');
  DBHelper.fetchReviewsByRestaurantId(id, (error, reviews) => {
    self.reviews = reviews;
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    //get the restaurant
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }

      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage.
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.alt = `Image of restaurant ${restaurant.name}`;
  image.title = restaurant.name;
  if(lazyLoad){
    image.setAttribute('data-src',DBHelper.mediumImageUrlForRestaurant(restaurant));
  } else {
    image.src = DBHelper.mediumImageUrlForRestaurant(restaurant);
  }
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');

  const divReview = document.createElement('div');
  divReview.className = 'container';

  const name = document.createElement('div');
  name.innerHTML = review.name;
  divReview.appendChild(name);

  const date = document.createElement('div');
  const updatedAt = new Date(review.updatedAt).toISOString().split('T')[0];
  date.innerHTML = updatedAt;
  divReview.appendChild(date);

  const rating = document.createElement('div');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'rating';
  divReview.appendChild(rating);

  const comments = document.createElement('div');
  comments.innerHTML = review.comments;
  divReview.appendChild(comments);

  li.appendChild(divReview);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu.
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.setAttribute("aria-current", "page");
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Register service worker.
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

  // Request a one-off sync for background sync of reviews in DB.
  navigator.serviceWorker.ready.then(function(swRegistration) {
    return swRegistration.sync.register('reviewDBSync');
  });
}

/**
 * Initialize the review form.
 */
initReviewForm = () => {
  form = document.getElementById('reviewForm')

  form.addEventListener('submit', function(evt) {
    evt.preventDefault();

    const dateNow = Date.now();
    const reviewIDB = {
      "id": 0,
      "restaurant_id": Number(self.restaurant.id),
      "name": document.getElementById('frmName').value,
      "createdAt": dateNow,
      "updatedAt": dateNow,
      "rating": Number(document.getElementById('frmScore').value),
      "comments": document.getElementById('frmComments').value.trim()
    };

    //post data to IndexDB objectstore
    DBHelper.addReviewInIDB(reviewIDB);

    //clear POST form inputs
    clearFormInputs();

    //refresh the page to show new reviews
    window.location.reload();

    return false;
  });
}

/**
 * Initialize the form inputs.
 */
initFormInputs = () => {
  const inputs = document.getElementsByTagName('input');
  const inputs_len = inputs.length;
  let addDirtyClass = function(evt) {
    evt.srcElement.classList.toggle('dirty', true);
  };
  for (let i = 0; i < inputs_len; i++) {
    let input = inputs[i];
    input.addEventListener('blur', addDirtyClass);
    input.addEventListener('invalid', addDirtyClass);
    input.addEventListener('valid', addDirtyClass);
  }
  document.getElementById('frmComments').value = '';
}

/**
 * Clear the values of the form inputs.
 */
clearFormInputs = () => {
  const inputs = document.getElementsByTagName('input');
  const inputs_len = inputs.length;
  for (let i = 0; i < inputs_len; i++) {
    let input = inputs[i];
    input.value = '';
  }
  document.getElementById('frmComments').value = '';
}
