/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Restaurants URL.
   */
  static get RESTAURANTS_URL() {
    const port = 1337;
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Reviews URL.
   */
  static get REVIEWS_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Add restaurants in IndexDB
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
   * Add reviews in IndexDB
   * @param {*} items
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
   * Get all restaurants from IndexDB
   */
  static getRestaurantsFromIDB() {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('restaurants', 'readonly');
      const store = tx.objectStore('restaurants');
      return store.getAll();
    });
  }

  /**
   * Get all reviews from IndexDB.
   */
  static getReviewsFromIDB() {
    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('reviews', 'readonly');
      const store = tx.objectStore('reviews');
      return store.getAll();
    });
  }

  /**
   * Get all reviews from IndexDB given a certain restaurant_id.
   */
  static getReviewsFromIDBById(restaurant_id) {
    const range = IDBKeyRange.only(Number(restaurant_id));

    return DBHelper.dbPromise.then(function(db) {
      const tx = db.transaction('reviews', 'readonly');
      const store = tx.objectStore('reviews');
      const index = store.index('restaurant_id');
      return index.getAll(range);
    });

  }

  /**
   * Fetch all restaurants either from IndexDB or from network.
   */
  static fetchRestaurants(callback) {
    DBHelper.getRestaurantsFromIDB().then(function(restaurantsIDB) {
      if (restaurantsIDB === undefined || restaurantsIDB.length == 0) {
        DBHelper.fetchFromNetwork(DBHelper.RESTAURANTS_URL, (error, restaurantsNetwork) => {
          if (error) {
            callback(error, null);
          } else {
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
   * Fetch all data from network
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
   * Fetch all reviews either from IndexDB or from network.
   */
  static fetchReviews(callback) {
    DBHelper.getReviewsFromIDB().then(function(reviewsIDB) {
      if (reviewsIDB === undefined || reviewsIDB.length == 0) {
        DBHelper.fetchFromNetwork(DBHelper.REVIEWS_URL, (error, reviewsNetwork) => {
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
   * Fetch a restaurant by its ID.
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
   * Fetch all reviews of a restaurant from IndexDB given it's restaurant_id.
   */
  static fetchReviewsByRestaurantId(restaurantId, callback) {
    DBHelper.getReviewsFromIDBById(restaurantId).then(function(reviewsIDB) {
      if (reviewsIDB) {
        callback(null, reviewsIDB);
      } else {
        callback(`There are no reviews for restaurant_id ${restaurantId}`, null);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
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
      console.log('Creating the restaurants object store');
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});

      console.log('Creating the reviews object store');
      upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
    case 2:
      console.log('Creating an index on name for Restaurants');
      const restaurantStore = upgradeDb.transaction.objectStore('restaurants');
      restaurantStore.createIndex('name', 'name', {unique: true});

      console.log('Creating an index on reastaurant_id for Reviews')
      const reviewsStore = upgradeDb.transaction.objectStore('reviews');
      reviewsStore.createIndex('restaurant_id', 'restaurant_id');
  }

});