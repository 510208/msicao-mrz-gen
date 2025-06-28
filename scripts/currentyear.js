// 自動更新頁尾的當前年分
document.addEventListener("DOMContentLoaded", function () {
  const currentYear = new Date().getFullYear();
  const footerYearElement = document.querySelector("#current-year");
  if (footerYearElement) {
    footerYearElement.textContent = currentYear;
  }
});
