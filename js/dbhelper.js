/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337;
    return `http://localhost:${port}/`;
  }

  /**
   * Add restaurants in IndexDB.
   * @param {*} items
   */
  static addRestaurantsInIDB(items) {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');

      return Promise.all(items.map(function(item) {
        if(store.get(item.id)){
          return store.put(item);
        } else {
          return store.add(item);
        }
      })
      ).catch(function(e) {
        tx.abort();
        console.log(e);
      }).then(function() {
        //console.log('All restaurants added successfully to IndexDB');
      });

    });
  }

  /**
   * Update the is_favorite attribute in both the database and IndexDB.
   * @param {*} restaurantId restaurant ID
   * @param {*} isFavorite boolean indicating if restaurant is favorite
   */
  static updateFavoriteStatus(restaurantId, isFavorite) {
    //if we are offline
    if(!navigator.onLine) {
      DBHelper.sendFavoriteWhenOnline(restaurantId, isFavorite);
      return;
    }

    fetch(`${DBHelper.DATABASE_URL}restaurants/${restaurantId}/?is_favorite=${isFavorite}`,
      {method: 'PUT'})
      .then(() => {
        DBHelper.updateFavoriteStatusInIDB(restaurantId, isFavorite, true);
      });
  }

  /**
   * Update the is_favorite attribute in IndexDB.
   * @param {*} restaurantId restaurant ID
   * @param {*} isFavorite boolean indicating if restaurant is favorite
   * @param {*} favoriteSynched boolean indicating if IDB info is in sync with DB info
   */
  static updateFavoriteStatusInIDB(restaurantId, isFavorite, favoriteSynched) {
    DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      store.get(restaurantId).then(restaurant => {
        restaurant.is_favorite = isFavorite;
        restaurant.favoriteSynched = favoriteSynched;
        store.put(restaurant);
      });
    });
  }

  /**
   * Updates a review in IndexDB.
   * @param {*} item the review
   */
  static updateReviewInIDB(item) {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      return store.put(item);
    });
  }

  /**
   * Add review
   * @param {*} review review {restaurant_id,name,updatedAt,rating,comments}
   */
  static addReview(review){
    //if we are offline
    if(!navigator.onLine) {
      DBHelper.sendReviewsWhenOnline(review);
      return;
    }
    let reviewForDB = {
      "restaurant_id": review.restaurant_id,
      "name": review.name,
      "rating": review.rating,
      "comments": review.comments
    };
    DBHelper.postData(`${DBHelper.DATABASE_URL}reviews`, reviewForDB);
  }

  /**
   * Create a HASH for the given string
   * @param {*} str The input string
   */
  static hash(str) {
    let hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr   = str.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Syncs the is_favorite from INdexDB with the backend.
   * @param {*} restaurantId the restaurant ID
   * @param {*} isFavorite the restaurant is_favorite state
   */
  static sendFavoriteWhenOnline(restaurantId, isFavorite) {
    //store favorite in IndexDB but mark the favoriteSynched as false
    DBHelper.updateFavoriteStatusInIDB(restaurantId, isFavorite, false);

    window.addEventListener('online', (event) => {
      //get all restaurants that have favoriteSynched set to false
      DBHelper.getRestaurantsFromIDB().then(function(restaurantsIDB) {
        const restaurant = restaurantsIDB.find(r => r.id == restaurantId);

        DBHelper.updateFavoriteStatus(restaurant.id, restaurant.is_favorite)
      });
    });
  }

  /**
   * Send the reviews in local storage to the backend.
   * @param {*} review review {restaurant_id,name,updatedAt,rating,comments}
   */
  static sendReviewsWhenOnline(review) {
    //store object in localstorage
    const strData = JSON.stringify(review);
    const strHash = DBHelper.hash(strData);
    localStorage.setItem(strHash, strData);

    window.addEventListener('online', (event) => {
      //get all offline reviews in localstorage and add them to the backend DB
      let key, data, keyData, dataHash;
      for(var i =0; i < localStorage.length; i++){
        key = localStorage.key(i);
        keyData = localStorage.getItem(key);
        dataHash = DBHelper.hash(keyData);

        if(key == dataHash) {//only the reviews from our DB will be considered
          data = JSON.parse(keyData);
          if(data){
            DBHelper.addReview(data);

            localStorage.removeItem(key);
          }
        }
      }
    });
  }

  /**
   * Post data in the backend database.
   */
  static postData (url = '', data = {}) {
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

  /**
   * Add reviews in IndexDB.
   * @param {*} items multiple items
   */
  static addReviewsInIDB(items) {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');

      return Promise.all(items.map(function(item) {
        if(store.get(item.id)){
          return store.put(item);
        } else {
          return store.add(item);
        }
      })
      ).catch(function(e) {
        tx.abort();
        console.log(e);
      }).then(function() {
        //console.log('All reviews added successfully to IndexDB');
      });

    });
  }

  /**
   * Get all restaurants from IndexDB.
   */
  static getRestaurantsFromIDB() {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('restaurants', 'readonly');
      const store = tx.objectStore('restaurants');
      return store.getAll();
    });
  }

  /**
   * Get all reviews from IndexDB given a certain restaurant_id.
   * @param {*} restaurantId restaurant ID or 0 to retrieve all reviews
   */
  static getReviewsFromIDBById(restaurant_id = 0) {
    if(restaurant_id === 0) {
      return DBHelper.dbPromise.then(function(db) {
        const tx = db.transaction('reviews', 'readonly');
        const store = tx.objectStore('reviews');
        return store.getAll();
      });
    } else {
      return DBHelper.dbPromise.then(function(db) {
        const range = IDBKeyRange.only(Number(restaurant_id));
        const tx = db.transaction('reviews', 'readonly');
        const store = tx.objectStore('reviews');
        const index = store.index('updatedAt');
        return index.getAll(range);
      });
    }
  }

  /**
   * Fetch all restaurants either from IndexDB or from network.
   */
  static fetchRestaurants(callback) {
    DBHelper.getRestaurantsFromIDB().then(function(restaurantsIDB) {
      if (restaurantsIDB === undefined || restaurantsIDB.length == 0) {
        DBHelper.fetchFromNetwork(DBHelper.DATABASE_URL + 'restaurants', (error, restaurantsNetwork) => {
          if (error) {
            callback(error, null);
          } else {
            //correct the is_favorite property value in the backend
            for (let restaurant of restaurantsNetwork) {
              restaurant.is_favorite = (restaurant.is_favorite === "true" || restaurant.is_favorite === true)?true:false;
            }
            DBHelper.addRestaurantsInIDB(restaurantsNetwork);
            callback(null, restaurantsNetwork);
          }
        });
      } else {
        callback(null, restaurantsIDB);
      }
    });
  }

  /**
   * Fetch all data from network.
   * @param {*} url depending on the value, either all the restaurants or the reviews will be retrieved
   * @param {*} callback
   */
  static fetchFromNetwork(url='', callback) {
    fetch(url).then(response =>
      response.json().then(data => ({
        data: data,
        status: response.status
      })
      ).then(res => {
        callback(null, res.data);
      })).catch(function (error) {
      callback(error, null);
    });
  }

  /**
   * Fetch a restaurant by its ID.
   * @param {*} id restaurant ID
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) {
          callback(null, restaurant);
        } else {
          callback(`Restaurant with id ${id} does not exist`, null);
        }
      }
    });
  }

  /**
   * Fetch all reviews of a restaurant given it's restaurant_id.
   * @param {*} restaurantId restaurant ID
   */
  static fetchReviewsByRestaurantId(restaurantId, callback) {
    DBHelper.getReviewsFromIDBById(restaurantId).then(function(reviewsIDB) {
      if (reviewsIDB === undefined || reviewsIDB.length == 0) {
        DBHelper.fetchFromNetwork(`${DBHelper.DATABASE_URL}reviews/?restaurant_id=${restaurantId}`, (error, reviewsNetwork) => {
          if (error) {
            callback(error, null);
          } else {
            DBHelper.addReviewsInIDB(reviewsNetwork);
            callback(null, reviewsNetwork);
          }
        });
      } else {
        callback(null, reviewsIDB);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   * @param {*} cuisine cuisine
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   * @param {*} neighborhood neighborhood
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   * @param {*} cuisine cuisine
   * @param {*} neighborhood neighborhood
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant small image URL.
   */
  static smallImageUrlForRestaurant(restaurant) {
    return (`/images/${restaurant.id}-133x100.jpg`);
  }

  /**
   * Restaurant medium image URL.
   */
  static mediumImageUrlForRestaurant(restaurant) {
    return (`/images/${restaurant.id}-399x300.jpg`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}

DBHelper.dbPromise = idb.open('mws-restaurant', 3, function(upgradeDb) {
  switch (upgradeDb.oldVersion) {
  case 0:
    // a placeholder case so that the switch block will
    // execute when the database is first created
    // (oldVersion is 0)
  case 1:
    upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
    upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
  case 2:
    const restaurantStore = upgradeDb.transaction.objectStore('restaurants');
    restaurantStore.createIndex('name', 'name', {unique: true});

    const reviewsStore = upgradeDb.transaction.objectStore('reviews');
    reviewsStore.createIndex('updatedAt', 'updatedAt');
  }

});