document.addEventListener("DOMContentLoaded", () => {
  // --- 組態常數 ---
  const CONFIG = {
    MRZ_LINE_LENGTH: 44,
    PASSPORT_TYPE: "P",
    COUNTRY_CODE_LENGTH: 3,
    PASSPORT_NUMBER_FIELD_LENGTH: 9,
    // *** 修改點 1: 調整個人識別碼區域的長度 ***
    // 根據圖像範例，此區域(包含<<符號和其自身的校驗碼)佔滿剩餘空間，共15個字元
    PERSONAL_ID_SECTION_LENGTH: 15,
    WEIGHTS: [7, 3, 1],
    FILLER: "<",
  };

  const passportTypeField = document.getElementById("passportType");
  passportTypeField.value = CONFIG.PASSPORT_TYPE;

  // --- DOM 元素 (與之前相同) ---
  const mrzForm = document.getElementById("mrz-form");
  const mrzLine1Output = document.getElementById("mrzLine1");
  const mrzLine2Output = document.getElementById("mrzLine2");
  const errorMessage = document.getElementById("error-message");

  // --- 字元數值對照表 (與之前相同) ---
  const CHAR_TO_VALUE = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    A: 10,
    B: 11,
    C: 12,
    D: 13,
    E: 14,
    F: 15,
    G: 16,
    H: 17,
    I: 18,
    J: 19,
    K: 20,
    L: 21,
    M: 22,
    N: 23,
    O: 24,
    P: 25,
    Q: 26,
    R: 27,
    S: 28,
    T: 29,
    U: 30,
    V: 31,
    W: 32,
    X: 33,
    Y: 34,
    Z: 35,
    "<": 0,
  };

  //calculateCheckDigit, sanitizeAndPad, buildMrzLine1 函式保持不變...
  function calculateCheckDigit(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      const value = CHAR_TO_VALUE[char];
      if (value === undefined) {
        throw new Error(`不支援的字元 "${char}"，無法計算校驗碼。`);
      }
      sum += value * CONFIG.WEIGHTS[i % CONFIG.WEIGHTS.length];
    }
    return sum % 10;
  }

  function sanitizeAndPad(str, length) {
    const sanitized = str.toUpperCase().replace(/[^A-Z0-9<]/g, CONFIG.FILLER);
    // 如果 length 為 0，則不進行填充或截斷，僅返回清理後的字串
    if (length === 0) return sanitized;
    return sanitized.padEnd(length, CONFIG.FILLER).substring(0, length);
  }

  function buildMrzLine1({ countryCode, lastName, firstName }) {
    const type = CONFIG.PASSPORT_TYPE;
    const country = sanitizeAndPad(countryCode, CONFIG.COUNTRY_CODE_LENGTH);
    const prefix = `${type}${CONFIG.FILLER}${country}${CONFIG.FILLER}${CONFIG.FILLER}`;

    const nameFieldContent = `${sanitizeAndPad(lastName, 0)}<<${sanitizeAndPad(
      firstName,
      0
    )}`;
    const nameField = sanitizeAndPad(
      nameFieldContent,
      CONFIG.MRZ_LINE_LENGTH - prefix.length
    );

    return prefix + nameField;
  }

  /**
   * *** 最終修正: 重寫 buildMrzLine2 以正確處理個人識別碼 ***
   * @param {object} data - 包含所有第二行所需欄位的物件
   * @returns {string} - MRZ 第二行
   */
  function buildMrzLine2({
    passportNumber,
    nationality,
    dob,
    gender,
    expiryDate,
    personalIdentifier,
  }) {
    // 1. 護照號碼 + 校驗碼 (10位)
    const passportNumPadded = sanitizeAndPad(
      passportNumber,
      CONFIG.PASSPORT_NUMBER_FIELD_LENGTH
    );
    const passportNumCD = calculateCheckDigit(passportNumPadded);
    const part1 = `${passportNumPadded}${CONFIG.FILLER}${passportNumCD}`;

    // 2. 國籍 (3位)
    const part2 = sanitizeAndPad(nationality, CONFIG.COUNTRY_CODE_LENGTH);

    // 3. 出生日期 + 校驗碼 (7位)
    const dobCD = calculateCheckDigit(dob);
    const part3 = `${dob}`;

    // 4. 性別 (1位)
    const part4 = sanitizeAndPad(gender, 1);

    // 5. 有效期 + 校驗碼 (7位)
    const expiryDateCD = calculateCheckDigit(expiryDate);
    const part5 = `${expiryDate}${CONFIG.FILLER}${expiryDateCD}`;

    // 6. 個人識別碼部分 (共 15 位)
    // a. 將使用者輸入的個人識別碼，填充或截斷至 14 位，作為計算校驗碼的資料。
    const personalIdData = sanitizeAndPad(personalIdentifier, 7);

    //    b. 根據這 14 位的資料計算校驗碼。
    const personalIdCD = calculateCheckDigit(personalIdData);

    // 7. 組合所有部分。總長度: 10+3+7+1+7+14+1 = 44
    const mrzLine2 = `${part1}${CONFIG.FILLER}${part2}${CONFIG.FILLER}${part3}${CONFIG.FILLER}${part4}${CONFIG.FILLER}${part5}${CONFIG.FILLER}${CONFIG.FILLER}${personalIdData}${CONFIG.FILLER}${personalIdCD}`;

    return mrzLine2;
  }

  // handleGenerateMrz 函式保持不變
  function handleGenerateMrz(event) {
    event.preventDefault();
    errorMessage.textContent = "";
    mrzLine1Output.textContent = "";
    mrzLine2Output.textContent = "";

    try {
      // --- 獲取並驗證資料 ---
      const formData = {
        countryCode: document.getElementById("countryCode").value,
        lastName: document.getElementById("lastName").value,
        firstName: document.getElementById("firstName").value,
        passportNumber: document.getElementById("passportNumber").value,
        nationality: document.getElementById("nationality").value,
        dob: document.getElementById("dob").value,
        gender: document.getElementById("gender").value,
        expiryDate: document.getElementById("expiryDate").value,
        personalIdentifier: document.getElementById("personalIdentifier").value,
      };

      if (
        !formData.lastName ||
        !formData.firstName ||
        !formData.passportNumber ||
        !formData.dob ||
        !formData.expiryDate
      ) {
        throw new Error("請填寫所有必填欄位。");
      }
      if (!/^\d{6}$/.test(formData.dob)) {
        throw new Error("出生日期格式不正確，應為 YYMMDD。");
      }
      if (!/^\d{6}$/.test(formData.expiryDate)) {
        throw new Error("有效期格式不正確，應為 YYMMDD。");
      }

      // --- 生成 MRZ ---
      const mrz1 = buildMrzLine1(formData);
      const mrz2 = buildMrzLine2(formData);

      // --- 顯示結果 ---
      mrzLine1Output.textContent = mrz1;
      mrzLine2Output.textContent = mrz2;

      Swal.fire({
        title: "MRZ已產生",
        text: "你所請求的MRZ已成功產生，請檢查下方輸出。",
        icon: "success",
      });

      mrzLine1Output.scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      errorMessage.textContent = error.message;
      Swal.fire({
        title: "錯誤",
        text: "請檢查主控台所顯示的錯誤。如有需要，請向開發者反饋。",
        icon: "error",
      });
      console.error(error);
    }
  }

  // 複製事件處理器
  function handleCopyToClipboard(event) {
    const target = event.target;
    const textToCopy = `{mrzLine1Output.textContent}\n{mrzLine2Output.textContent}`;

    const el = document.createElement("textarea");
    el.value = textToCopy;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }

  mrzForm.addEventListener("submit", handleGenerateMrz);
});
