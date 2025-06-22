document.addEventListener('DOMContentLoaded', () => {
    const mrzForm = document.getElementById('mrz-form');
    const mrzLine1Output = document.getElementById('mrzLine1');
    const mrzLine2Output = document.getElementById('mrzLine2');
    const errorMessage = document.getElementById('error-message');

    mrzForm.addEventListener('submit', (event) => {
        event.preventDefault(); // 阻止表單預設提交行為
        generateMrz();
    });

    // 模10演算法所需的字元數值對照表
    const charToValue = {
        '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
        'A': 10, 'B': 11, 'C': 12, 'D': 13, 'E': 14, 'F': 15, 'G': 16, 'H': 17, 'I': 18,
        'J': 19, 'K': 20, 'L': 21, 'M': 22, 'N': 23, 'O': 24, 'P': 25, 'Q': 26, 'R': 27,
        'S': 28, 'T': 29, 'U': 30, 'V': 31, 'W': 32, 'X': 33, 'Y': 34, 'Z': 35,
        '<': 0 // 填充符號對應數值為 0
    };

    // 校驗碼計算函數
    function calculateCheckDigit(data) {
        let sum = 0;
        const weights = [7, 3, 1]; // 權重循環
        for (let i = 0; i < data.length; i++) {
            const char = data[i].toUpperCase(); // 確保是大寫以便查找
            const value = charToValue[char];
            if (value === undefined) {
                // 如果遇到不支援的字元，回傳 null 以觸發錯誤訊息
                console.warn(`Unsupported character in check digit calculation: ${char}`);
                return null; 
            }
            sum += value * weights[i % 3]; // 權重循環使用
        }
        return sum % 10; // 取餘數
    }

    // 獲取表單值並生成 MRZ
    function generateMrz() {
        errorMessage.textContent = ''; // 清空之前的錯誤訊息
        mrzLine1Output.textContent = '';
        mrzLine2Output.textContent = '';

        // 獲取所有輸入欄位的值，並進行基礎的格式處理
        const passportType = document.getElementById('passportType').value.toUpperCase(); // 應為 P
        const countryCode = document.getElementById('countryCode').value.toUpperCase().padEnd(3, '<'); // 國家代碼固定 3 碼
        const lastName = document.getElementById('lastName').value.toUpperCase();
        const firstName = document.getElementById('firstName').value.toUpperCase();
        const passportNumber = document.getElementById('passportNumber').value.toUpperCase();
        const nationality = document.getElementById('nationality').value.toUpperCase().padEnd(3, '<'); // 國籍固定 3 碼
        const dob = document.getElementById('dob').value; // YYMMDD
        const gender = document.getElementById('gender').value.toUpperCase();
        const expiryDate = document.getElementById('expiryDate').value; // YYMMDD
        const personalIdentifier = document.getElementById('personalIdentifier').value.toUpperCase();

        // 輸入驗證 (基礎驗證)
        if (!lastName || !firstName || !passportNumber || !dob || !expiryDate) {
            errorMessage.textContent = '請填寫所有必填欄位。';
            return;
        }

        if (dob.length !== 6 || !/^\d{6}$/.test(dob)) {
            errorMessage.textContent = '出生日期格式不正確，應為 YYMMDD。';
            return;
        }
        if (expiryDate.length !== 6 || !/^\d{6}$/.test(expiryDate)) {
            errorMessage.textContent = '有效期格式不正確，應為 YYMMDD。';
            return;
        }

        // --- 組裝第一行 MRZ ---
        // 格式: P<國家代碼<<姓氏<<名 (總長 44 字元)
        let mrz1Prefix = `${passportType}<${countryCode}`; // 例如: P<MWR (5 字元)

        // 處理姓名部分，確保只包含合法字元，並用 '<' 或 '<<' 分隔
        const formattedLastName = lastName.replace(/[^A-Z0-9<]/g, '<'); 
        const formattedFirstName = firstName.replace(/[^A-Z0-9<]/g, '<'); 

        // 姓名欄位總長度為 44 - mrz1Prefix.length = 44 - 5 = 39 字元
        let nameField = `${formattedLastName}<<${formattedFirstName}`;
        
        // 對姓名欄位進行填充或截斷，使其精確到 39 字元
        const remainingSpaceForNameField = 44 - mrz1Prefix.length; // 39 字元
        if (nameField.length > remainingSpaceForNameField) {
            nameField = nameField.substring(0, remainingSpaceForNameField);
        } else {
            nameField = nameField.padEnd(remainingSpaceForNameField, '<');
        }
        
        const mrz1 = mrz1Prefix + nameField;


        // --- 組裝第二行 MRZ ---
        // 格式: 護照號碼<校驗碼<國籍<出生年月日<性別<有效期<校驗碼<<個人識別碼<校驗碼 (總長 44 字元)
        
        // 1. 護照號碼及校驗碼 (總共 10 字元：9 碼護照號碼 + 1 碼校驗碼)
        const passportNumberPadded = passportNumber.padEnd(9, '<'); 
        const passportNumberCheckDigit = calculateCheckDigit(passportNumberPadded);
        if (passportNumberCheckDigit === null) { errorMessage.textContent = '護照號碼校驗碼計算失敗。'; return; }
        const mrz2_docNum_cd = `${passportNumberPadded}${passportNumberCheckDigit}`;

        // 2. 國籍 (固定 3 字元)
        const mrz2_nationality = nationality.padEnd(3, '<');

        // 3. 出生年月日及校驗碼 (總共 7 字元：YYMMDD + 1 碼校驗碼)
        const dobCheckDigit = calculateCheckDigit(dob);
        if (dobCheckDigit === null) { errorMessage.textContent = '出生日期校驗碼計算失敗。'; return; }
        const mrz2_dob_cd = `${dob}${dobCheckDigit}`;

        // 4. 性別 (固定 1 字元)
        const mrz2_gender = gender;

        // 5. 有效期及校驗碼 (總共 7 字元：YYMMDD + 1 碼校驗碼)
        const expiryDateCheckDigit = calculateCheckDigit(expiryDate);
        if (expiryDateCheckDigit === null) { errorMessage.textContent = '有效期校驗碼計算失敗。'; return; }
        const mrz2_expiry_cd = `${expiryDate}${expiryDateCheckDigit}`;

        // 6. 個人識別碼及校驗碼部分 (<<個人識別碼<校驗碼)
        // 這部分需要填充，使得整個 MRZ 第二行總長為 44 字元
        // 假設 "個人識別碼<校驗碼" 這個子區塊（不含 "<<"）的長度，需要填滿到 13 字元，加上 "<<" 就會是 15 字元
        // 這樣，最後剩下 1 字元給最終校驗碼 (28 + 15 + 1 = 44)
        
        let personalIdWithCd = '';
        if (personalIdentifier) {
            const pidCheckDigit = calculateCheckDigit(personalIdentifier);
            if (pidCheckDigit === null) { errorMessage.textContent = '個人識別碼校驗碼計算失敗。'; return; }
            personalIdWithCd = `${personalIdentifier}${pidCheckDigit}`;
        }
        // 對個人識別碼及其校驗碼的組合進行填充或截斷，使其精確到 13 字元
        personalIdWithCd = personalIdWithCd.padEnd(13, '<');
        if (personalIdWithCd.length > 13) personalIdWithCd = personalIdWithCd.substring(0, 13);
        
        const mrz2_personalId_section_full = `<<${personalIdWithCd}`; // 包含 "<<"，總共 15 字元


        // 7. 組裝用於計算最終校驗碼的字串 (第二行所有內容，不含最終校驗碼本身)
        const finalCheckDigitSource = 
            mrz2_docNum_cd +
            mrz2_nationality +
            mrz2_dob_cd +
            mrz2_gender +
            mrz2_expiry_cd +
            mrz2_personalId_section_full; // 此時總長應為 28 + 15 = 43 字元

        // 8. 計算最終校驗碼
        const finalCompositeCheckDigit = calculateCheckDigit(finalCheckDigitSource);
        if (finalCompositeCheckDigit === null) { errorMessage.textContent = '最終校驗碼計算失敗。'; return; }

        // 9. 組裝完整的第二行 MRZ (總長 44 字元)
        const mrz2 = `${finalCheckDigitSource}${finalCompositeCheckDigit}`;
        
        // 顯示結果，並使用 trim() 確保沒有前後的空白或換行符號
        mrzLine1Output.textContent = mrz1.trim();
        mrzLine2Output.textContent = mrz2.trim();
    }
});
