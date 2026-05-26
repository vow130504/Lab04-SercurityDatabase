const fs = require('fs');

const html = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/3.3.2/jsencrypt.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
</head>
<body>
    <script>
        const pubKey = "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmYGEnIjxeB39Azp8n6XJ\\nb1roxkxRPIS3xFARolCE8MkuMMOQAbD08Bz40dQpZniPZ0Z0RD9LCqzw9X3BhEDn\\nLvW/AsZjlH13iAZSGTTYQunY228xIs/ThGBpLZtLhs6nqUriUqg/iz2hPkZYphH+\\nv46AT2Ant7uVKijMGapONC78+h1zoJdQFXpOtuDcJ7QXjCtYhK071A9qLS9IuGCZ\\nzGjZylJunEHmxzA9eDZSQ0WXzb549BjH0/92GLLLv9YQNonWj8YQLKEzCoaI5Vxt\\ng3nk5sPrpWjCgzz+hdQ8MpI/YhGHpHCsiX6UTyLIxroVQ3BArm8GQofEdnPjdpMW\\nPwIDAQAB\\n-----END PUBLIC KEY-----";
        const encryptedPrivKey = "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";
        
        const bytes = CryptoJS.AES.decrypt(encryptedPrivKey, "123@");
        const privKey = bytes.toString(CryptoJS.enc.Utf8);
        
        const encText = "SfDrmTPYn+VKpsMkPKJEMCoMw9IQlcUKGKVRdlTMpJgNGREuOEWM8RqZZX661mpfcscxbZRd1o6FBwhZh0tkUzAxko3qgxQJs4CeY6rlC572qG7tzJh8nuVr/aDN2WKe9YKV+ecXXH9WAiaA/idIE6stjKjgzpQ2vSip/sJyB7hIX329QWjlKNfOm3WDeKFdOXYlOfwkW80rAOvXDZ5zdXQgPRUUPfkXhTOp09OtuTgnbWVsvi/fGy2f4mq5eyRcBKoazM4d8iQENA1v7DRJ9o+vODNrRqKV0rOwnrEe7pbsTALXN21sZVLKjMUrflSfwFS9+AzPWVHwI8BQwAUmEQ==";
        
        const dec = new JSEncrypt();
        dec.setPrivateKey(privKey);
        const result = dec.decrypt(encText);
        
        console.log("Decrypted:", result);
    </script>
</body>
</html>
`;
fs.writeFileSync('test.html', html);
