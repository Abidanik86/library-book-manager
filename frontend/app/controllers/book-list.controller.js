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
      "$window",
      BookListController,
    ]);

  function BookListController(BookService, $location, $document, $timeout, $scope, $window) {
    var vm = this;
    var toastTimer = null;

    var CATEGORY_TONES = {
      technology: "tone-tech",
      science: "tone-science",
      fiction: "tone-fiction",
      history: "tone-history",
      biography: "tone-bio",
    };

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

    vm.viewMode = readSavedViewMode();
    vm.currentPage = 1;
    vm.pageSize = 8;

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
    vm.setViewMode = setViewMode;
    vm.visibleBooks = visibleBooks;
    vm.paginatedBooks = paginatedBooks;
    vm.totalPages = totalPages;
    vm.setPage = setPage;
    vm.pageRangeText = pageRangeText;
    vm.getBorrowedCount = getBorrowedCount;
    vm.getAvailableCount = getAvailableCount;
    vm.getAvailabilityPercent = getAvailabilityPercent;
    vm.getBookInitial = getBookInitial;
    vm.getCategoryTone = getCategoryTone;
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

    function readSavedViewMode() {
      try {
        var saved = $window.localStorage.getItem("library_view_mode");
        return saved === "grid" ? "grid" : "table";
      } catch (e) {
        return "table";
      }
    }

    function setViewMode(mode) {
      vm.viewMode = mode === "grid" ? "grid" : "table";
      try {
        $window.localStorage.setItem("library_view_mode", vm.viewMode);
      } catch (e) {}
    }

    function onDocumentClick() {
      if (vm.openMenu) {
        $scope.$applyAsync(function () {
          vm.openMenu = null;
        });
      }
    }

    function onDocumentKeyDown(event) {
      if (event.key === "Escape") {
        $scope.$applyAsync(function () {
          vm.openMenu = null;
          if (vm.borrowModalBook && !vm.borrowing) {
            closeBorrowModal();
          }
          if (vm.deleteModalBook && !vm.deleting) {
            closeDeleteModal();
          }
        });
        return;
      }

      if (event.key === "/" && !vm.borrowModalBook && !vm.deleteModalBook) {
        var tag = event.target && event.target.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          event.preventDefault();
          var input = $document[0].getElementById("bookSearchInput");
          if (input) {
            input.focus();
          }
        }
      }
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
      vm.currentPage = 1;

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
      vm.currentPage = 1;
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

    function totalPages() {
      var count = visibleBooks().length;
      return Math.max(1, Math.ceil(count / vm.pageSize));
    }

    function paginatedBooks() {
      var list = visibleBooks();
      var maxPage = Math.max(1, Math.ceil(list.length / vm.pageSize));
      if (vm.currentPage > maxPage) {
        vm.currentPage = maxPage;
      }
      var start = (vm.currentPage - 1) * vm.pageSize;
      return list.slice(start, start + vm.pageSize);
    }

    function setPage(pageNum) {
      var maxPage = totalPages();
      if (pageNum < 1 || pageNum > maxPage) {
        return;
      }
      vm.currentPage = pageNum;
    }

    function pageRangeText() {
      var total = visibleBooks().length;
      if (total === 0) {
        return "0 books";
      }
      var start = (vm.currentPage - 1) * vm.pageSize + 1;
      var end = Math.min(total, vm.currentPage * vm.pageSize);
      return "Showing " + start + "–" + end + " of " + total + (total === 1 ? " book" : " books");
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
      vm.currentPage = 1;
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

    function getAvailabilityPercent() {
      if (!vm.books.length) {
        return 0;
      }
      return Math.round((getAvailableCount() / vm.books.length) * 100);
    }

    function getBookInitial(book) {
      var title = book && book.title ? book.title.trim() : "";
      return title ? title.charAt(0).toUpperCase() : "B";
    }

    function getCategoryTone(category) {
      var key = (category || "").trim().toLowerCase();
      return CATEGORY_TONES[key] || "tone-general";
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
