from flask import Blueprint, request, jsonify, session
from app.models.invites import (
    create_invite_token, verify_token, get_invite_tokens, revoke_token
)
from app.auth import login_required, admin_required
from app.utils import log_action

invite_bp = Blueprint('invite', __name__)

@invite_bp.route('/api/invite/verify', methods=['GET'])
def verify():
    token = request.args.get('token', '').strip()
    if not token:
        return jsonify({'valid': False, 'error': '缺少令牌'})
    valid, msg, _ = verify_token(token)
    return jsonify({'valid': valid, 'message': msg})

@invite_bp.route('/api/invite', methods=['POST'])
@login_required
def create():
    """Any logged-in user can create invite tokens."""
    data = request.get_json() or {}
    expires_in_days = data.get('expires_in_days') or None
    max_uses = int(data.get('max_uses', 1))

    token = create_invite_token(
        created_by=session['user_id'],
        expires_in_days=expires_in_days,
        max_uses=max_uses
    )
    log_action('create_invite', session['user_id'],
               {'token': token['token'][:8] + '...'})
    return jsonify(dict(token)), 201

@invite_bp.route('/api/invite', methods=['GET'])
@login_required
def list_tokens():
    """List invite tokens. Admin sees all, regular users see their own."""
    if session.get('role') == 'admin':
        tokens = get_invite_tokens()
    else:
        tokens = get_invite_tokens(created_by=session['user_id'])
    return jsonify({'invites': [dict(t) for t in tokens]})

@invite_bp.route('/api/invite/<int:token_id>', methods=['DELETE'])
@login_required
def revoke(token_id):
    revoke_token(token_id)
    log_action('revoke_invite', session['user_id'], {'token_id': token_id})
    return jsonify({'message': '已撤销'})
