(function () {
  "use strict";

  angular
    .module("libraryApp", ["ngRoute"])
    .config(["$routeProvider", "$locationProvider", function ($routeProvider, $locationProvider) {
      $locationProvider.hashPrefix("!");

      $routeProvider
        .when("/books", {
          templateUrl: "app/views/book-list.html",
          controller: "BookListController",
          controllerAs: "vm",
        })
        .when("/books/new", {
          templateUrl: "app/views/book-form.html",
          controller: "BookFormController",
          controllerAs: "vm",
        })
        .when("/books/:id/edit", {
          templateUrl: "app/views/book-form.html",
          controller: "BookFormController",
          controllerAs: "vm",
        })
        .otherwise({
          redirectTo: "/books",
        });
    }])
    .controller("ThemeController", ["$document", "$window", ThemeController]);

  function ThemeController($document, $window) {
    var vm = this;
    var root = $document[0].documentElement;

    vm.theme = root.getAttribute("data-bs-theme") || "light";
    vm.toggleTheme = toggleTheme;

    function toggleTheme() {
      vm.theme = vm.theme === "dark" ? "light" : "dark";
      root.setAttribute("data-bs-theme", vm.theme);
      try {
        $window.localStorage.setItem("library_theme", vm.theme);
      } catch (e) {}
    }
  }
})();
