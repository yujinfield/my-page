// 작성일 기준 확인 (순수 함수, DOM 없음)
// 가격·운영시간·혜택·취소 조건처럼 바뀌는 정보(volatile)는
// 작성일 기준으로 다시 확인했는지 기록합니다.
//
// draft.verified = { "<common|카테고리>.<key>": "확인한 작성일" }
// 저장된 날짜가 지금 작성일(common.checkedDate)과 같을 때만 "확인됨"입니다.
// 그래서 작성일을 바꾸면 모든 확인이 자동으로 풀립니다.

import { COMMON_GROUPS, DETAIL_GROUPS } from './fields.js';

export function verifyKey(scope, fieldKey) {
  return `${scope}.${fieldKey}`;
}

export function isVerified(draft, key) {
  return draft.verified[key] === draft.common.checkedDate && draft.common.checkedDate !== '';
}

export function setVerified(draft, key, checked) {
  if (checked) {
    draft.verified[key] = draft.common.checkedDate;
  } else {
    delete draft.verified[key];
  }
}

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== '';
}

// 지금 글(공통 + 고른 카테고리)에서 바뀌는 정보 칸 목록
function listVolatile(draft) {
  const items = [];
  const addFrom = (groups, scope, values) => {
    groups.forEach((group) => {
      group.fields.forEach((field) => {
        if (!field.volatile) return;
        items.push({
          key: verifyKey(scope, field.key),
          label: field.label,
          filled: hasValue(values[field.key]),
        });
      });
    });
  };

  addFrom(COMMON_GROUPS, 'common', draft.common);
  if (draft.category) {
    addFrom(DETAIL_GROUPS[draft.category], draft.category, draft.details[draft.category]);
  }
  return items;
}

// 입력한 칸만 셉니다. 비어 있는 칸은 확인할 것이 없으니 빼요.
// 돌려주는 값: { total, verifiedCount, unverified: [라벨, ...] }
export function getVerifyStatus(draft) {
  const filled = listVolatile(draft).filter((item) => item.filled);
  const unverified = filled.filter((item) => !isVerified(draft, item.key)).map((item) => item.label);
  return {
    total: filled.length,
    verifiedCount: filled.length - unverified.length,
    unverified,
  };
}

// "2026-10-17" → "2026년 10월 17일"
export function formatDate(isoDate) {
  if (!isoDate) return '작성일 미입력';
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
