const SHEET_NAME = 'KetQua';
const HEADERS = ['Thời gian nhận','Học viên','Trình độ','Đề thi','Nghe đúng','Nghe tổng','Điểm nghe','Đọc đúng','Đọc tổng','Điểm đọc','Viết 86–95 đúng','Viết 86–95 tổng','Điểm viết 86–95','Câu 96–100 đã làm','Câu 96–100 tổng','Điểm tự động','Câu sai','Toàn bộ đáp án'];
function doPost(e){
  const sheet=getSheet_(); let data={};
  try{data=JSON.parse((e&&e.postData&&e.postData.contents)||'{}')}catch(_){ }
  const listeningScore=Number(data.listeningCorrect||0)*2.22;
  const readingScore=Number(data.readingCorrect||0)*2.5;
  const writingScore=Number(data.writingOrderCorrect||0)*6;
  sheet.appendRow([new Date(),data.studentName||'',data.level||'',data.examId||'',Number(data.listeningCorrect||0),Number(data.listeningTotal||0),listeningScore,Number(data.readingCorrect||0),Number(data.readingTotal||0),readingScore,Number(data.writingOrderCorrect||0),Number(data.writingOrderTotal||0),writingScore,Number(data.pictureAnswered||0),Number(data.pictureTotal||0),Number(data.autoScore||0),data.wrong||'[]',data.answers||'{}']);
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}
function getSheet_(){
  const ss=SpreadsheetApp.getActiveSpreadsheet(); let sheet=ss.getSheetByName(SHEET_NAME);
  if(!sheet)sheet=ss.insertSheet(SHEET_NAME);
  if(sheet.getLastRow()===0){sheet.appendRow(HEADERS);sheet.setFrozenRows(1);sheet.getRange(1,1,1,HEADERS.length).setFontWeight('bold');}
  return sheet;
}
