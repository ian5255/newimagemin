const fs = require('fs');
const { Worker } = require('worker_threads');
const { Command } = require('commander');
const program = new Command();
const worker = new Worker('./worker.js');

async function readFileHandle(sourcePath) {
  return fs.readdirSync(sourcePath);
}

program
  .version('1.0.0')
  .option('-Q --quality [0~100]', '壓縮質量', '70')
  .option('-I --input [folder]', '原始目錄', './')
  .option('-O --output [folder]', '轉檔存放目錄', './')
  .option('-T --thread [1~100]', '線程數', '1')
  .parse();


// worker_threads ====================================================================================================
const runService = (sourcePath, destinationPath, quality, threads, files) => {
  if (files.length === 0) return false;
  return new Promise((resolve, reject) => {
    let countSuccessNum = 0; // 成功數
    let countFailedNum = 0; // 失敗數
    let countHandleNum = 0; // 處理檔案數
    let countTimeConsuming = 0; // 總耗時
    let countWorkerThreadsComplete = 0; // 計算線程完成數
    let workerThreads = threads;

    const fileNumAvg = parseInt(files.length / threads);
    // 如果開的線程數比均分數還少，那就直接把線程數設為檔案數
    if (fileNumAvg === 0) {
      workerThreads = files.length;
    }

    for (let i = 0; i < workerThreads; i++) {
      let workerFileArr = [];
      if (i === (workerThreads - 1)) {
        workerFileArr = files.slice((i * fileNumAvg), (((i + 1) * fileNumAvg) + (files.length % workerThreads))); // 切分分派的filesArr
      } else {
        workerFileArr = files.slice((i * fileNumAvg), ((i + 1) * fileNumAvg)); // 切分分派的filesArr
      }
      
      // const worker = new Worker('./worker.js');
      worker.postMessage({
        fileArr: workerFileArr,
        start: i, // 起始
        end: (((i + 1) * fileNumAvg) - 1), // 結束
        sourcePath: sourcePath,
        destinationPath: destinationPath,
        quality: quality,
        group: (i + 1)
      });
    }
    // 接收worker handle result
    worker.on('message', countObj => {
      countSuccessNum += countObj.successed; // 成功數
      countFailedNum += countObj.failed; // 失敗數
      countHandleNum += countObj.total; // 處理檔案數
      // countTimeConsuming += countObj.timeConsuming; // 總耗時
      countWorkerThreadsComplete += 1; // 計算線程完成數

      // 如果已回報「完成」線程數 === 開立的線程數，就彙整報告
      if (countWorkerThreadsComplete === workerThreads) {
        resolve(true);
        console.info("處理檔案總數：" + countHandleNum + "。成功：" + countSuccessNum + "。失敗：" + countFailedNum);
      }
    });
  });
}

const run = async () => {
  const start = new Date().getTime();
  const options = program.opts(); // 取得commandLine設定參數

  // step1 get sourcePath files
  const files = await readFileHandle(options.input);
  if (files === []) {
    console.log('目錄無檔案！');
    return;
  }

  // step2 開線程分派工作
  const result = await runService(options.input, options.output, Number(options.quality), Number(options.thread), files);
  const end = new Date().getTime();
  if (result) {
    console.info("處理時間：" + (end - start) / 1000 + " sec");
  }
}
run().catch(err => console.error(err));
