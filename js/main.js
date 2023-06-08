document.addEventListener('DOMContentLoaded', function() {
    // hide default pages on splash screen

    pageDisplay('score');
    pageDisplay('about');
    pageDisplay('canvas');
    pageDisplay('gameOver');

    //Menu Buttons

  
});

function pageDisplay(name, show = false){
    const pageMap = {
        score: '#high-scores-page',
        about: '#about-page',
        gameOver: '#game-over-box',
        menu: '#menu-page',
        canvas:'canvas'
    }

    const pageSelector = pageMap[name];

  const element = document.querySelector(pageSelector);
  if(!show){
    element.className = 'hide';
    return
  }

  element.className = 'show';
}


function getButtonElement(name){
    const buttonMap = {
        start: '#start-game-button',
        score:'#high-scores-button',
        about:'#about-button',
        exit: '#exit-button'
    }

    return document.querySelector(buttonMap[name])
}