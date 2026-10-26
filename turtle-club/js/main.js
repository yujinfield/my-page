// 거북이 클럽: 모바일 메뉴, 이번 달·연도 표시

// 모바일 메뉴 열고 닫기
const menuButton = document.getElementById("menu-button");
const siteNav = document.getElementById("site-nav");

function setMenu(isOpen) {
  siteNav.classList.toggle("is-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
}

menuButton.addEventListener("click", function () {
  setMenu(!siteNav.classList.contains("is-open"));
});

// 메뉴 항목을 누르면 메뉴 닫기
siteNav.addEventListener("click", function (event) {
  if (event.target.tagName === "A") setMenu(false);
});

// "이번 달" 자리에 실제 월(예: 11월) 표시
const today = new Date();
const monthText = (today.getMonth() + 1) + "월";

document.querySelectorAll(".js-month").forEach(function (element) {
  element.textContent = monthText;
});

document.getElementById("year").textContent = today.getFullYear();
