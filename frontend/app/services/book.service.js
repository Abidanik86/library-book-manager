(function () {
  "use strict";

  angular
    .module("libraryApp")
    .factory("BookService", ["$http", "$q", "$window", BookService]);

  function BookService($http, $q, $window) {
    var host = $window.location.hostname || "127.0.0.1";
    var port = $window.location.port;
    var isLocalHost = host === "127.0.0.1" || host === "localhost";
    var API_BASE =
      isLocalHost && port && port !== "5000"
        ? "http://" + host + ":5000/api/books"
        : "/api/books";
    var pendingNotice = "";

    function extractError(err, fallbackMessage) {
      if (err && err.data && err.data.error) {
        return err.data.error;
      }
      if (err && err.status === 0) {
        return "Cannot reach the backend server. Make sure Flask is running on port 5000.";
      }
      return fallbackMessage || "An unexpected error occurred.";
    }

    function unwrap(promise, fallbackMessage) {
      return promise
        .then(function (response) {
          return response.data;
        })
        .catch(function (err) {
          return $q.reject(extractError(err, fallbackMessage));
        });
    }

    return {
      list: function (filters) {
        var params = {};
        if (filters && filters.search) {
          params.search = filters.search;
        }
        if (filters && filters.category) {
          params.category = filters.category;
        }
        if (filters && filters.sort) {
          params.sort = filters.sort;
        }
        return unwrap(
          $http.get(API_BASE, { params: params }),
          "Failed to load books."
        );
      },

      get: function (id) {
        return unwrap(
          $http.get(API_BASE + "/" + encodeURIComponent(id)),
          "Failed to load book details."
        );
      },

      create: function (payload) {
        return unwrap(
          $http.post(API_BASE, payload),
          "Failed to create book."
        );
      },

      update: function (id, payload) {
        return unwrap(
          $http.put(API_BASE + "/" + encodeURIComponent(id), payload),
          "Failed to update book."
        );
      },

      remove: function (id) {
        return unwrap(
          $http.delete(API_BASE + "/" + encodeURIComponent(id)),
          "Failed to delete book."
        );
      },

      borrow: function (id, borrowerName) {
        return unwrap(
          $http.post(API_BASE + "/" + encodeURIComponent(id) + "/borrow", {
            borrower_name: borrowerName,
          }),
          "Failed to borrow book."
        );
      },

      returnBook: function (id) {
        return unwrap(
          $http.post(API_BASE + "/" + encodeURIComponent(id) + "/return", {}),
          "Failed to return book."
        );
      },

      setNotice: function (message) {
        pendingNotice = message || "";
      },

      consumeNotice: function () {
        var msg = pendingNotice;
        pendingNotice = "";
        return msg;
      },
    };
  }
})();

