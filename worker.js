const sharp = require('sharp');
const fs = require('fs');
const convert = require('heic-convert');
const {promisify} = require('util');
const { parentPort } = require('worker_threads');

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
          // lossless: true,
          // smartSubsample: true,
          // alphaQuality: 50,
          quality: quality
        })
        .toFile(destinationPath + '/' + fileName[0] + '.webp');
      } else {
        await sharp(sourcePath + '/' + file)
        .webp({
          // lossless: true,
          // smartSubsample: true,
          // alphaQuality: 50,
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

/* 
paramsObj: {
  fileArr: workerFileArr,
  start: i, // 起始
  end: (((i + 1) * fileNumAvg) - 1), // 結束
  sourcePath: sourcePath,
  destinationPath: destinationPath,
  quality: quality,
  group: group
}
*/
parentPort.on('message', async paramsObj => {
  console.info("線程" + paramsObj.group + "開始執行...");
  const start = new Date().getTime();
  const countObj = {
    total: paramsObj.fileArr.length,
    successed: 0, // 成功
    failed: 0, // 失敗
    timeConsuming: 0 // 耗時(單位:秒)
  };
  let i = 0;
  const asyncWay = async(dataArray) => {
    for(const i in dataArray) {
      let heic2jpegBuffer = null;
      // get image data
      const getData = await getMetadata(paramsObj.sourcePath, dataArray[i]);

      // check isHEIC || isHEIF
      if (getData.format === "heic" || getData.format === "heif") {
        heic2jpegBuffer = await convert({
          buffer: await promisify(fs.readFile)(paramsObj.sourcePath + '/' + dataArray[i]), // the HEIC file buffer
          format: 'JPEG',      // output format
          quality: 0           // the jpeg compression quality, between 0 and 1
        });
      }
      
      const result = await resizeImage(paramsObj.sourcePath, paramsObj.destinationPath, paramsObj.quality, dataArray[i], heic2jpegBuffer);
      if (result) {
        countObj.successed++;
      } else {
        countObj.failed++;
      }
    }
  };
  await asyncWay(paramsObj.fileArr);

  const end = new Date().getTime();
  countObj.timeConsuming = (end - start) / 1000; // 統計耗時

  console.info("線程" + paramsObj.group + "已完成！ 費時：" + countObj.timeConsuming + "sec。處理檔案數：" + countObj.total + "。成功：" + countObj.successed + "。失敗：" + countObj.failed);
  parentPort.postMessage(countObj);
});