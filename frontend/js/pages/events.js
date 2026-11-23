$(function () {
  if (!Auth.requireLogin()) return;
  Layout.init();
});