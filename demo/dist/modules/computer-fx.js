// The monitor has its own tiny vocabulary: disk activity, a busy cursor,
// video resynchronization, and the patiently typing computer.
export class ComputerEffects {
  constructor(screen, response, reducedMotion = false) {
    this.screen = screen;
    this.response = response;
    this.reducedMotion = reducedMotion;
    this.timers = new Map();
    this.disk = document.createElement('span');
    this.disk.className = 'disk-activity';
    this.disk.setAttribute('aria-hidden', 'true');
    document.querySelector('.terminal-status').prepend(this.disk);
    this.echo = document.createElement('p');
    this.echo.className = 'command-echo';
    this.echo.hidden = true;
    response.before(this.echo);
    this.sweep = document.createElement('div');
    this.sweep.className = 'video-sync';
    this.sweep.setAttribute('aria-hidden', 'true');
    screen.append(this.sweep);
  }
  later(key, fn, delay) {
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => { this.timers.delete(key); fn(); }, delay));
  }
  input(text) {
    this.echo.hidden = false;
    this.echo.textContent = 'PAUL> ' + text;
    this.activity(220);
  }
  activity(duration = 450) {
    this.disk.classList.add('working');
    this.later('disk', () => this.disk.classList.remove('working'), duration);
  }
  respond(text) {
    clearTimeout(this.timers.get('type'));
    this.fullText = text;
    this.response.setAttribute('aria-busy', 'true');
    let count = 0;
    const finish = () => {
      this.response.textContent = text;
      this.response.classList.remove('is-typing');
      this.response.setAttribute('aria-busy', 'false');
    };
    if (this.reducedMotion) { finish(); return; }
    this.response.classList.add('is-typing');
    const write = () => {
      count += 3;
      this.response.textContent = text.slice(0, count);
      if (count >= text.length) finish();
      else this.later('type', write, 22);
    };
    write();
  }
  cue(kind, duration = 540) {
    this.activity(duration);
    this.screen.dataset.effect = kind;
    this.screen.classList.toggle('computer-busy', ['load', 'boot', 'print', 'preview'].includes(kind));
    this.later('cue', () => {
      delete this.screen.dataset.effect;
      this.screen.classList.remove('computer-busy');
    }, duration);
  }
  clear() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    this.response.classList.remove('is-typing');
    this.response.setAttribute('aria-busy', 'false');
    if (this.fullText) this.response.textContent = this.fullText;
    this.disk.classList.remove('working');
    delete this.screen.dataset.effect;
    this.screen.classList.remove('computer-busy');
  }
}
