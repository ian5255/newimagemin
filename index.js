const sharp = require('sharp');
const fs = require('fs');
const convert = require('heic-convert');
const {promisify} = require('util');

async function readFileHandle(sourcePath) {
  return fs.readdirSync(sourcePath);
}

// 取得圖片資訊
async function getMetadata(sourcePath, file) {
  try {
    return await sharp(sourcePath+ '/' + file).metadata();
  } catch (error) {
    console.log(`An error occurred during processing: ${error}`);
    return false;
  }
}

// 圖片轉檔
async function resizeImage(sourcePath, destinationPath, quality, file, buffer) {
  const fileName = file.split('.');
  try {
      if (buffer) {
        await sharp(buffer)
        .webp({
          reductionEffort: 0,
          alphaQuality: 0,
          quality: quality
        })
        .toFile(destinationPath + '/' + fileName[0] + '.webp');
      } else {
        await sharp(sourcePath + '/' + file)
        .webp({
          reductionEffort: 0,
          alphaQuality: 0,
          quality: quality
        })
        .toFile(destinationPath + '/' + fileName[0] + '.webp');
      }
      return true;
  } catch (error) {
    console.log(error + '： ' + file);
    return false;
  }
}

// 裁切
// async function cropImage() {
//   try {
//     await sharp("sammy.png")
//       .extract({ width: 500, height: 330, left: 120, top: 70  })
//       .toFile("sammy-cropped.png");
//   } catch (error) {
//     console.log(error);
//   }
// }

// 旋轉
async function rotateImage() {
  try {
    await sharp("sammy.png")
      .rotate(33, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile("sammy-rotated.png");
  } catch (error) {
    console.log(error);
  }
}

// 圖片壓縮處理程序
async function ImageCompressHandler(sourcePath, destinationPath, quality) {
  const start = new Date().getTime();
  const files = await readFileHandle(sourcePath);
  if (files === []) {
    console.log('目錄無檔案！');
    return;
  }

  const countObj = {
    total: files.length,
    succeed: 0, // 成功
    failed: 0 // 失敗
  };

  let i = 0;
  const asyncWay = async(dataArray) => {
    for(const i in dataArray) {
      let heic2jpegBuffer = null;
      // get image data
      const getData = await getMetadata(sourcePath, dataArray[i]);

      // check isHEIC || isHEIF
      if (getData.format === "heic" || getData.format === "heif") {
        heic2jpegBuffer = await convert({
          buffer: await promisify(fs.readFile)(sourcePath + '/' + dataArray[i]), // the HEIC file buffer
          format: 'JPEG',      // output format
          quality: 0           // the jpeg compression quality, between 0 and 1
        });
      }
      
      const result = await resizeImage(sourcePath, destinationPath, quality, dataArray[i], heic2jpegBuffer);
      if (result) {
        countObj.succeed++;
      } else {
        countObj.failed++;
      }
    }
  }
  await asyncWay(files);
  console.log("檔案總數：" + countObj.total + "; " + "成功：" + countObj.succeed + "; " + "失敗：" + countObj.failed);
  const end = new Date().getTime();
  console.log("總耗時："+(end - start) / 1000 + "sec");
}

ImageCompressHandler('src/assets/origin', 'src/assets/result', 30);
