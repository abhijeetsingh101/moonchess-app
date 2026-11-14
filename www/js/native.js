/* MoonChess app bridge: runs only inside the Android app.
   Android Back button behaviour, dark system bars, and splash hand-off. */
(function () {
  var Cap = window.Capacitor;
  var native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  document.documentElement.classList.toggle('native-app', native);
  if (!native) return;
  var P = Cap.Plugins || {};

  // Light icons on the dark status and navigation bars.
  try { P.SystemBars && P.SystemBars.setStyle({ style: 'DARK' }); } catch (e) { }

  // Back button: close a dialog, leave a lesson, go to Home, then exit.
  function closeDialog() {
    var m = document.querySelector('#modal .modal');
    if (!m) return false;
    var b = m.querySelector('[data-a="0"],[data-a="look"],[data-t="Q"]') || m.querySelector('button');
    if (b) b.click(); else document.getElementById('modal').innerHTML = '';
    return true;
  }
  if (P.App) {
    P.App.addListener('backButton', function () {
      if (closeDialog()) return;
      var view = location.hash.slice(1) || 'home';
      if (view === 'mission') { var back = document.getElementById('tBack'); if (back) { back.click(); return; } }
      if (view !== 'home') { location.hash = 'home'; return; }
      P.App.exitApp();
    });
  }

  // Hide the splash screen once the page has drawn.
  function hideSplash() { try { P.SplashScreen && P.SplashScreen.hide({ fadeOutDuration: 300 }); } catch (e) { } }
  if (document.readyState === 'complete') setTimeout(hideSplash, 150);
  else addEventListener('load', function () { setTimeout(hideSplash, 150); });
})();
