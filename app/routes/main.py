from flask import Blueprint, render_template, redirect, url_for, session, request
from app.models.users import user_count
from app.auth import page_login_required, page_admin_required
from app.models.invites import verify_token

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Redirect based on state: no users -> setup, logged in -> app, else -> login."""
    if 'user_id' in session:
        if session.get('role') == 'admin':
            return redirect(url_for('main.app_page'))
        return redirect(url_for('main.app_page'))
    if user_count() == 0:
        return redirect(url_for('main.setup_page'))
    return redirect(url_for('main.login_page'))

@main_bp.route('/setup')
def setup_page():
    if user_count() > 0:
        return redirect(url_for('main.login_page'))
    return render_template('setup.html')

@main_bp.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('main.app_page'))
    if user_count() == 0:
        return redirect(url_for('main.setup_page'))
    return render_template('login.html')

@main_bp.route('/join')
def join_page():
    """Registration page with optional invite token."""
    if 'user_id' in session:
        return redirect(url_for('main.app_page'))
    if user_count() == 0:
        return redirect(url_for('main.setup_page'))
    token = request.args.get('token', '')
    valid = False
    if token:
        is_valid, msg, _ = verify_token(token)
        valid = is_valid
    return render_template('register.html', token=token, token_valid=valid)

@main_bp.route('/app')
@page_login_required
def app_page():
    return render_template('app.html')

@main_bp.route('/admin')
@page_admin_required
def admin_page():
    return render_template('admin.html')
