// 거북이 클럽 페이지: 모바일 메뉴, 포스터 크게 보기, 날짜 표시

// 모바일 메뉴 열고 닫기
const menuButton = document.getElementById("menu-button");
const siteNav = document.getElementById("site-nav");

menuButton.addEventListener("click", function () {
  const isOpen = siteNav.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
});

// 메뉴 항목을 누르면 메뉴 닫기
siteNav.addEventListener("click", function (event) {
  if (event.target.tagName === "A") {
    siteNav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "메뉴 열기");
  }
});

// 인요가 포스터를 누르면 크게 보기
const posterButton = document.getElementById("poster-button");
const poster = document.getElementById("yoga-poster");

posterButton.addEventListener("click", function () {
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-label", "포스터 크게 보기 (누르면 닫혀요)");

  const bigImage = document.createElement("img");
  bigImage.src = poster.src;
  bigImage.alt = poster.alt;
  lightbox.appendChild(bigImage);

  function close() {
    lightbox.remove();
    document.removeEventListener("keydown", onKeydown);
  }
  function onKeydown(event) {
    if (event.key === "Escape") close();
  }

  lightbox.addEventListener("click", close);
  document.addEventListener("keydown", onKeydown);
  document.body.appendChild(lightbox);
});

// "이번 달" 자리에 실제 월 표시, 푸터 연도 표시
const today = new Date();
document.getElementById("book-month").textContent = (today.getMonth() + 1) + "월의 책";
document.getElementById("year").textContent = today.getFullYear();
