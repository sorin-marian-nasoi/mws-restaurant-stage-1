let restaurant;
let form;
var map2;

document.addEventListener('DOMContentLoaded', (event) => {
  initReviewForm();
  initFormInputs();
  //registerServiceWorker();
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
 * Create restaurant HTML and add it to the webpage
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
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
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
  date.innerHTML = review.date;
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
 * Add restaurant name to the breadcrumb navigation menu
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

/**
 * Send the review form data
 */
sendReviewData = () => {
  var XHR = new XMLHttpRequest();

  // Bind the FormData object and the form element
  var FD = new FormData(form);

  // Define what happens on successful data submission
  XHR.addEventListener("load", function(event) {
    initFormInputs();
    alert(event.target.responseText);
  });

  // Define what happens in case of error
  XHR.addEventListener("error", function(event) {
    alert('Oops! Something went wrong.');
  });

  form.action = "http://localhost:1337/reviews/";

  let dataString = 'restaurant_id='+ '3' + '&name=' + FD.name + '&date=' + FD.date + '&rating=' + FD.rating + '&comments=' + FD.comments;

  // Set up our request
  XHR.open("POST", "http://localhost:1337/reviews/");

  // The data sent is what the user provided in the form
  XHR.send(dataString);
}

/**
 * Initialize the review form
 */
initReviewForm = () => {
  form = document.getElementById("reviewForm")
  form.addEventListener("submit", function(evt) {
    if (form.checkValidity() === false) {
      evt.preventDefault();
      alert("Form is invalid - submission prevented!");
      return false;
    }
    sendReviewData();
  });
}

/**
 * Initialize the form inputs
 */
initFormInputs = () => {
  const inputs = document.getElementsByTagName("input");
  const inputs_len = inputs.length;
  let addDirtyClass = function(evt) {
    evt.srcElement.classList.toggle("dirty", true);
  };
  for (let i = 0; i < inputs_len; i++) {
    let input = inputs[i];
    input.addEventListener("blur", addDirtyClass);
    input.addEventListener("invalid", addDirtyClass);
    input.addEventListener("valid", addDirtyClass);
  }
  document.getElementById("frmComments").value = "";
}
