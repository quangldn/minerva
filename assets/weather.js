/* Thời tiết Hà Nội — Open-Meteo (miễn phí, không cần API key)
   Tự chạy khi mở trang. Hỏng mạng thì hiện trạng thái lỗi, không vỡ layout. */
(function(){
  var el = document.getElementById('weather');
  if(!el) return;

  var LAT = 21.0278, LON = 105.8342;
  var URL = 'https://api.open-meteo.com/v1/forecast'
    + '?latitude=' + LAT + '&longitude=' + LON
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    + '&timezone=Asia%2FBangkok&forecast_days=4';

  /* mã WMO -> nhãn tiếng Việt + ký hiệu */
  var WMO = {
    0:['Trời quang','☀'], 1:['Ít mây','🌤'], 2:['Có mây','⛅'], 3:['Nhiều mây','☁'],
    45:['Sương mù','🌫'], 48:['Sương mù đóng băng','🌫'],
    51:['Mưa phùn nhẹ','🌦'], 53:['Mưa phùn','🌦'], 55:['Mưa phùn nặng','🌦'],
    56:['Mưa phùn lạnh','🌧'], 57:['Mưa phùn lạnh','🌧'],
    61:['Mưa nhẹ','🌦'], 63:['Mưa','🌧'], 65:['Mưa to','🌧'],
    66:['Mưa lạnh','🌧'], 67:['Mưa lạnh nặng','🌧'],
    71:['Tuyết nhẹ','🌨'], 73:['Tuyết','🌨'], 75:['Tuyết dày','🌨'], 77:['Hạt tuyết','🌨'],
    80:['Mưa rào nhẹ','🌦'], 81:['Mưa rào','🌧'], 82:['Mưa rào rất to','⛈'],
    85:['Mưa tuyết','🌨'], 86:['Mưa tuyết nặng','🌨'],
    95:['Dông','⛈'], 96:['Dông kèm mưa đá','⛈'], 99:['Dông mưa đá lớn','⛈']
  };
  function wmo(code){ return WMO[code] || ['—','·']; }

  var DOW = ['CN','T2','T3','T4','T5','T6','T7'];
  function dow(iso){
    var d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? '—' : DOW[d.getDay()];
  }
  function r(n){ return (n===null||n===undefined||isNaN(n)) ? '—' : Math.round(n); }

  function skeleton(){
    el.innerHTML =
      '<div class="wx-head">'
      + '<span class="wx-city">Hà Nội</span>'
      + '<span class="wx-state">đang lấy dữ liệu…</span>'
      + '</div>';
  }

  function fail(msg){
    el.innerHTML =
      '<div class="wx-head">'
      + '<span class="wx-city">Hà Nội</span>'
      + '<span class="wx-state">' + msg + '</span>'
      + '</div>';
  }

  function render(d){
    var cur = d.current || {};
    var day = d.daily || {};
    var t = day.time || [];

    var c = wmo(cur.weather_code);
    var rain0 = (day.precipitation_probability_max || [])[0];

    var html =
      '<div class="wx-head">'
      + '<span class="wx-city">Hà Nội</span>'
      + '<span class="wx-state">' + c[0] + '</span>'
      + '</div>'
      + '<div class="wx-now">'
      +   '<span class="wx-icon">' + c[1] + '</span>'
      +   '<span class="wx-temp">' + r(cur.temperature_2m) + '°</span>'
      +   '<span class="wx-meta">'
      +     'Cảm giác ' + r(cur.apparent_temperature) + '°'
      +     ' · Ẩm ' + r(cur.relative_humidity_2m) + '%'
      +     ' · Gió ' + r(cur.wind_speed_10m) + ' km/h'
      +     (rain0 === undefined ? '' : ' · Mưa ' + r(rain0) + '%')
      +   '</span>'
      + '</div>';

    var days = '';
    for(var i=1; i<Math.min(t.length,4); i++){
      var w = wmo((day.weather_code||[])[i]);
      days +=
        '<div class="wx-day">'
        + '<span class="wx-dow">' + dow(t[i]) + '</span>'
        + '<span class="wx-di">' + w[1] + '</span>'
        + '<span class="wx-hl"><b>' + r((day.temperature_2m_max||[])[i]) + '°</b>'
        + '<i>' + r((day.temperature_2m_min||[])[i]) + '°</i></span>'
        + '</div>';
    }
    if(days) html += '<div class="wx-days">' + days + '</div>';

    el.innerHTML = html;
  }

  skeleton();

  var done = false;
  var timer = setTimeout(function(){ if(!done){ done = true; fail('không lấy được (quá hạn)'); } }, 8000);

  fetch(URL, {cache:'no-store'})
    .then(function(res){ if(!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function(data){
      if(done) return;
      done = true; clearTimeout(timer);
      if(!data || !data.current) throw new Error('thiếu dữ liệu');
      render(data);
    })
    .catch(function(){
      if(done) return;
      done = true; clearTimeout(timer);
      fail('không lấy được thời tiết');
    });
})();
