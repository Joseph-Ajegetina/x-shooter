document.addEventListener('DOMContentLoaded', function () {
    // hide default pages on splash screen

    pageDisplay('scores');
    pageDisplay('about');
    pageDisplay('canvas');
    pageDisplay('gameOver');

    //Menu Buttons

    //start button
    const startBtn = getButtonElement('start');
    startBtn.addEventListener('click', () => {
        // Hide the menu block, and show canvas
        pageDisplay('menu');
        pageDisplay('canvas', true);

        let canvas = document.getElementById("canvas");
        let context = canvas.getContext("2d");
        let game = new Game(canvas, context);
        game.new();
        game.run();
    })

    // scores btn
    const scoresBtn = getButtonElement('score');
    scoresBtn.addEventListener('click', () => {
        // Hide the menu block, and show canvas
        pageDisplay('menu');
        pageDisplay('scores', true);

        let scores = JSON.parse(localStorage.getItem("scores"));

        // initialize the scores if none
        if (scores === null) {
            scores = [];
        }

        scores.sort((score1, score2) => {
            return score2.points - score1.points;
        });

        if (scores.length < 10) {
            displayScores(scores);
        } else {
            const trimmedScores = scores.slice(0, 10);
            displayScores(trimmedScores);
        }
    });

    // about btn
    const aboutBtn = getButtonElement('about');
    aboutBtn.addEventListener('click', () => {
        pageDisplay('menu');
        pageDisplay('about', true);
    })

    // back btn 
    const backBtns = document.querySelectorAll('.back-button');
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const scores = document.querySelector('#scores-ul')
            scores.innerHTML = '';
            pageDisplay('scores');
            pageDisplay('about');
            pageDisplay('menu', true);
        })
    })

    // exit btn 
    const exitBtn = getButtonElement('exit');
    exitBtn.addEventListener('click', () => {

        const nameElem = document.querySelector('#name-field');
        const value = nameElem.value;
        const playerName = !value ? "No Name" : value;

        const scoreElem = document.querySelector('#score-field');
        const points = scoreElem.innerHTML;

        const playerScore = {
            points,
            name: playerName
        }

        let scores = JSON.parse(localStorage.getItem('scores'));

        if (!scores) {
            scores = [];
        }

        scores.push(playerScore);

        localStorage.setItem('scores', JSON.stringify(scores));

        // Go to menu
        pageDisplay('canvas');
        pageDisplay('gameOver');
        pageDisplay('menu', true);
    })
});

function pageDisplay(name, show = false) {
    const pageMap = {
        scores: '#high-scores-page',
        about: '#about-page',
        gameOver: '#game-over-box',
        menu: '#menu-page',
        canvas: 'canvas'
    }

    const pageSelector = pageMap[name];

    const element = document.querySelector(pageSelector);
    if (!show) {
        element.className = 'hide';
        return
    }

    element.className = 'show';
}


function getButtonElement(name) {
    const buttonMap = {
        start: '#start-game-button',
        score: '#high-scores-button',
        about: '#about-button',
        exit: '#exit-button'
    }

    return document.querySelector(buttonMap[name])
}

function displayScores(scores) {
    const MAX_SCORES = 10;
    const scoresParent = document.querySelector('#scores-ul');

    scores.slice(0, MAX_SCORES).forEach(score => {
        const childElem = document.createElement('li')
        childElem.innerHTML = `${score.name} : <span class='light-grey'> ${score.points}</span>`

        scoresParent.appendChild(childElem);
    });
};
