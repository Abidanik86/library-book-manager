(function () {
  "use strict";

  angular
    .module("libraryApp")
    .controller("BookListController", [
      "BookService",
      "$location",
      "$document",
      "$timeout",
      "$scope",
      BookListController,
    ]);

  function BookListController(BookService, $location, $document, $timeout, $scope) {
    var vm = this;
    var toastTimer = null;

    vm.books = [];
    vm.loading = false;
    vm.actionBookId = null;
    vm.error = "";
    vm.successMessage = "";

    vm.search = "";
    vm.category = "";
    vm.sort = "newest";
    vm.statusFilter = "";
    vm.openMenu = null;

    vm.categories = ["Fiction", "Science", "History", "Technology", "Biography", "General"];
    vm.sortOptions = [
      { value: "newest", label: "Newest First", icon: "bi-clock" },
      { value: "title", label: "Title (A–Z)", icon: "bi-sort-alpha-down" },
      { value: "year_desc", label: "Year (Newest)", icon: "bi-sort-numeric-down-alt" },
      { value: "year_asc", label: "Year (Oldest)", icon: "bi-sort-numeric-down" },
    ];

    vm.borrowModalBook = null;
    vm.borrowerName = "";
    vm.borrowError = "";
    vm.borrowing = false;

    vm.deleteModalBook = null;
    vm.deleting = false;

    vm.loadBooks = loadBooks;
    vm.clearSearch = clearSearch;
    vm.clearFilters = clearFilters;
    vm.hasActiveFilters = hasActiveFilters;
    vm.toggleMenu = toggleMenu;
    vm.selectCategory = selectCategory;
    vm.selectSort = selectSort;
    vm.getSortLabel = getSortLabel;
    vm.setStatusFilter = setStatusFilter;
    vm.visibleBooks = visibleBooks;
    vm.getBorrowedCount = getBorrowedCount;
    vm.getAvailableCount = getAvailableCount;
    vm.editBook = editBook;
    vm.openBorrowModal = openBorrowModal;
    vm.closeBorrowModal = closeBorrowModal;
    vm.confirmBorrow = confirmBorrow;
    vm.returnBook = returnBook;
    vm.openDeleteModal = openDeleteModal;
    vm.closeDeleteModal = closeDeleteModal;
    vm.confirmDelete = confirmDelete;
    vm.dismissSuccess = dismissSuccess;

    var initialNotice = BookService.consumeNotice();
    if (initialNotice) {
      showSuccess(initialNotice);
    }

    function onDocumentClick() {
      if (vm.openMenu) {
        $scope.$applyAsync(function () {
          vm.openMenu = null;
        });
      }
    }

    function onDocumentKeyDown(event) {
      if (event.key !== "Escape") {
        return;
      }
      $scope.$applyAsync(function () {
        vm.openMenu = null;
        if (vm.borrowModalBook && !vm.borrowing) {
          closeBorrowModal();
        }
        if (vm.deleteModalBook && !vm.deleting) {
          closeDeleteModal();
        }
      });
    }

    $document.on("click", onDocumentClick);
    $document.on("keydown", onDocumentKeyDown);
    $scope.$on("$destroy", function () {
      $document.off("click", onDocumentClick);
      $document.off("keydown", onDocumentKeyDown);
      if (toastTimer) {
        $timeout.cancel(toastTimer);
      }
    });

    loadBooks();

    function showSuccess(message) {
      if (toastTimer) {
        $timeout.cancel(toastTimer);
      }
      vm.successMessage = message;
      toastTimer = $timeout(function () {
        vm.successMessage = "";
      }, 3500);
    }

    function dismissSuccess() {
      if (toastTimer) {
        $timeout.cancel(toastTimer);
      }
      vm.successMessage = "";
    }

    function mergeCategories(books) {
      var seen = {};
      var merged = [];
      vm.categories.forEach(function (c) {
        if (!seen[c]) {
          seen[c] = true;
          merged.push(c);
        }
      });
      books.forEach(function (b) {
        if (b.category && !seen[b.category]) {
          seen[b.category] = true;
          merged.push(b.category);
        }
      });
      vm.categories = merged;
    }

    function loadBooks() {
      vm.loading = true;
      vm.error = "";

      BookService.list({
        search: vm.search.trim(),
        category: vm.category,
        sort: vm.sort,
      })
        .then(function (books) {
          vm.books = books;
          mergeCategories(books);
        })
        .catch(function (errMsg) {
          vm.error = errMsg;
        })
        .finally(function () {
          vm.loading = false;
        });
    }

    function toggleMenu(name, event) {
      if (event) {
        event.stopPropagation();
      }
      vm.openMenu = vm.openMenu === name ? null : name;
    }

    function selectCategory(category) {
      vm.openMenu = null;
      if (vm.category === category) {
        return;
      }
      vm.category = category;
      loadBooks();
    }

    function selectSort(sortValue) {
      vm.openMenu = null;
      if (vm.sort === sortValue) {
        return;
      }
      vm.sort = sortValue;
      loadBooks();
    }

    function getSortLabel() {
      for (var i = 0; i < vm.sortOptions.length; i++) {
        if (vm.sortOptions[i].value === vm.sort) {
          return vm.sortOptions[i].label;
        }
      }
      return "Newest First";
    }

    function setStatusFilter(status) {
      vm.statusFilter = vm.statusFilter === status ? "" : status;
    }

    function visibleBooks() {
      if (!vm.statusFilter) {
        return vm.books;
      }
      var wantBorrowed = vm.statusFilter === "borrowed";
      return vm.books.filter(function (book) {
        return Boolean(book.is_borrowed) === wantBorrowed;
      });
    }

    function hasActiveFilters() {
      return Boolean(vm.search.trim() || vm.category || vm.statusFilter);
    }

    function clearSearch() {
      vm.search = "";
      loadBooks();
    }

    function clearFilters() {
      var needsReload = Boolean(vm.search.trim() || vm.category);
      vm.search = "";
      vm.category = "";
      vm.statusFilter = "";
      if (needsReload) {
        loadBooks();
      }
    }

    function getBorrowedCount() {
      return vm.books.filter(function (b) {
        return b.is_borrowed;
      }).length;
    }

    function getAvailableCount() {
      return vm.books.length - getBorrowedCount();
    }

    function editBook(book) {
      $location.path("/books/" + book.id + "/edit");
    }

    function openBorrowModal(book) {
      vm.openMenu = null;
      vm.borrowModalBook = book;
      vm.borrowerName = "";
      vm.borrowError = "";
      vm.borrowing = false;
    }

    function closeBorrowModal() {
      if (vm.borrowing) {
        return;
      }
      vm.borrowModalBook = null;
      vm.borrowerName = "";
      vm.borrowError = "";
    }

    function confirmBorrow(form) {
      if (form) {
        form.$setSubmitted();
      }
      var trimmed = (vm.borrowerName || "").trim();
      if (!trimmed) {
        vm.borrowError = "Borrower name is required.";
        return;
      }

      vm.borrowing = true;
      vm.borrowError = "";
      var targetId = vm.borrowModalBook.id;

      BookService.borrow(targetId, trimmed)
        .then(function (updated) {
          replaceBookInList(updated);
          vm.borrowModalBook = null;
          vm.borrowerName = "";
          showSuccess('"' + updated.title + '" borrowed by ' + updated.borrower_name + ".");
        })
        .catch(function (errMsg) {
          vm.borrowError = errMsg;
        })
        .finally(function () {
          vm.borrowing = false;
        });
    }

    function returnBook(book) {
      vm.actionBookId = book.id;
      vm.error = "";

      BookService.returnBook(book.id)
        .then(function (updated) {
          replaceBookInList(updated);
          showSuccess('"' + updated.title + '" marked as returned.');
        })
        .catch(function (errMsg) {
          vm.error = errMsg;
        })
        .finally(function () {
          vm.actionBookId = null;
        });
    }

    function openDeleteModal(book) {
      if (book.is_borrowed) {
        vm.error = "Borrowed book cannot be deleted until it is returned.";
        return;
      }
      vm.openMenu = null;
      vm.deleteModalBook = book;
      vm.deleting = false;
    }

    function closeDeleteModal() {
      if (vm.deleting) {
        return;
      }
      vm.deleteModalBook = null;
    }

    function confirmDelete() {
      if (!vm.deleteModalBook) {
        return;
      }
      var target = vm.deleteModalBook;
      vm.deleting = true;
      vm.error = "";

      BookService.remove(target.id)
        .then(function () {
          vm.books = vm.books.filter(function (item) {
            return item.id !== target.id;
          });
          vm.deleteModalBook = null;
          showSuccess('"' + target.title + '" deleted.');
        })
        .catch(function (errMsg) {
          vm.error = errMsg;
          vm.deleteModalBook = null;
        })
        .finally(function () {
          vm.deleting = false;
        });
    }

    function replaceBookInList(updated) {
      vm.books = vm.books.map(function (item) {
        return item.id === updated.id ? updated : item;
      });
    }
  }
})();
