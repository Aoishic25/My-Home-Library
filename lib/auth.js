// Single-admin login for the write routes. Credentials come from the
// environment (ADMIN_USER / ADMIN_PASSWORD); read-only pages stay public.
// If no password is configured, login is disabled and every write route stays
// locked (fail closed) rather than falling back to a default password.
const crypto = require('crypto');
const session = require('express-session');

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Compare digests so length differences don't leak and comparison is constant-time
function safeEqual(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}

// Only allow same-site relative redirects ("/index", not "//evil.com" or "http://...")
function safeNext(next, fallback = '/') {
    return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : fallback;
}

function createAuth(env = process.env) {
    const adminUser = env.ADMIN_USER || 'admin';
    const adminPassword = env.ADMIN_PASSWORD || '';
    const enabled = adminPassword.length > 0;
    const failures = new Map(); // ip -> { count, first }

    function tooManyAttempts(ip) {
        const f = failures.get(ip);
        if (!f) return false;
        if (Date.now() - f.first > WINDOW_MS) {
            failures.delete(ip);
            return false;
        }
        return f.count >= MAX_FAILURES;
    }

    function recordFailure(ip) {
        const f = failures.get(ip);
        if (!f || Date.now() - f.first > WINDOW_MS) failures.set(ip, { count: 1, first: Date.now() });
        else f.count += 1;
    }

    return {
        enabled,

        // Session middleware; also exposes `isAdmin` to every view.
        sessionMiddleware() {
            const secret = env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
            const mw = session({
                name: 'mhl.sid',
                secret,
                resave: false,
                saveUninitialized: false,
                cookie: { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
            });
            return [mw, (req, res, next) => {
                res.locals.isAdmin = !!(req.session && req.session.isAdmin);
                res.locals.authEnabled = enabled;
                next();
            }];
        },

        // Guard for write routes
        requireAdmin(req, res, next) {
            if (req.session && req.session.isAdmin) return next();

            const wantsJson = req.path === '/submit' || req.path === '/row';
            if (wantsJson) {
                return res.status(401).json({ message: 'Login required', messageType: 'error' });
            }
            // Pages: come back to the requested page after login. POST navigations
            // (table selector, form) can't be replayed, so land on the start of that flow.
            const next_ = req.method === 'GET' ? req.originalUrl : '/index';
            res.redirect(`/login?next=${encodeURIComponent(next_)}`);
        },

        // Returns { ok, status, message }
        attemptLogin(req) {
            const ip = req.ip;
            if (!enabled) {
                return { ok: false, status: 503, message: 'Login is not configured. Set ADMIN_PASSWORD in .env and restart.' };
            }
            if (tooManyAttempts(ip)) {
                return { ok: false, status: 429, message: 'Too many failed attempts. Try again in 15 minutes.' };
            }
            const { username = '', password = '' } = req.body || {};
            // Evaluate both so timing doesn't reveal which one was wrong
            const userOk = safeEqual(username, adminUser);
            const passOk = safeEqual(password, adminPassword);
            if (userOk && passOk) {
                failures.delete(ip);
                return { ok: true };
            }
            recordFailure(ip);
            return { ok: false, status: 401, message: 'Incorrect username or password.' };
        },

        safeNext
    };
}

module.exports = { createAuth, safeNext };
