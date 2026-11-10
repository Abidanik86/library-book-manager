(function () {
  "use strict";

  angular
    .module("libraryApp")
    .controller("BookFormController", [
      "BookService",
      "$routeParams",
      "$location",
      "$document",
      "$scope",
      BookFormController,
    ]);

  function BookFormController(BookService, $routeParams, $location, $document, $scope) {
    var vm = this;

    vm.isEdit = Boolean($routeParams.id);
    vm.bookId = $routeParams.id;
    vm.currentYear = new Date().getFullYear();
    vm.categories = ["Fiction", "Science", "History", "Technology", "Biography", "General"];

    vm.formData = {
      title: "",
      author: "",
      category: "Fiction",
      published_year: vm.currentYear,
    };

    vm.loading = false;
    vm.saving = false;
    vm.error = "";
    vm.categoryOpen = false;

    vm.toggleCategoryMenu = toggleCategoryMenu;
    vm.selectCategory = selectCategory;
    vm.save = save;
    vm.cancel = cancel;

    function onDocClick() {
      if (vm.categoryOpen) {
        $scope.$applyAsync(function () {
          vm.categoryOpen = false;
        });
      }
    }

    $document.on("click", onDocClick);
    $scope.$on("$destroy", function () {
      $document.off("click", onDocClick);
    });

    function toggleCategoryMenu(event) {
      if (event) {
        event.stopPropagation();
      }
      vm.categoryOpen = !vm.categoryOpen;
    }

    function selectCategory(cat) {
      vm.formData.category = cat;
      vm.categoryOpen = false;
    }

    if (vm.isEdit) {
      loadBook(vm.bookId);
    }

    function loadBook(id) {
      vm.loading = true;
      vm.error = "";

      BookService.get(id)
        .then(function (book) {
          if (book.category && vm.categories.indexOf(book.category) === -1) {
            vm.categories.push(book.category);
          }
          vm.formData = {
            title: book.title,
            author: book.author,
            category: book.category || "General",
            published_year: book.published_year,
          };
        })
        .catch(function (errMsg) {
          vm.error = errMsg;
        })
        .finally(function () {
          vm.loading = false;
        });
    }

    function save(form) {
      if (form) {
        form.$setSubmitted();
        if (form.$invalid) {
          return;
        }
      }

      var title = (vm.formData.title || "").trim();
      var author = (vm.formData.author || "").trim();
      if (!title || !author) {
        vm.error = "Title and author are required.";
        return;
      }

      vm.saving = true;
      vm.error = "";

      var payload = {
        title: title,
        author: author,
        category: (vm.formData.category || "General").trim(),
        published_year: Number(vm.formData.published_year),
      };

      var request = vm.isEdit
        ? BookService.update(vm.bookId, payload)
        : BookService.create(payload);

      request
        .then(function () {
          BookService.setNotice(
            vm.isEdit
              ? '"' + payload.title + '" updated successfully.'
              : '"' + payload.title + '" added to the catalog.'
          );
          $location.path("/books");
        })
        .catch(function (errMsg) {
          vm.error = errMsg;
        })
        .finally(function () {
          vm.saving = false;
        });
    }

    function cancel() {
      $location.path("/books");
    }
  }
})();
