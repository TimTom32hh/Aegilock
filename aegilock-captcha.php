<?php
/*
Plugin Name: Aegilock Captcha
Plugin URI: https://aegilock.de/
Description: Unsichtbarer, DSGVO-konformer Bot-Schutz mit Proof-of-Work und ML – ohne Cookies, ohne Google, ohne Tracking.
Version: 1.1
Author: Aegilock
Author URI: https://aegilock.de/
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Requires at least: 5.0
Tested up to: 6.5
Requires PHP: 7.4
Text Domain: aegilock-captcha
*/

defined('ABSPATH') || exit;

// Admin-Seite einbinden
require_once plugin_dir_path(__FILE__) . 'admin-page.php';

// Frontend-Skript laden
function aegilock_enqueue_script() {
    wp_enqueue_script(
        'aegilock-widget',
        'https://aegilock.de/widget/aegilock.min.js',
        [],
        null,
        true
    );

    $config = [
        'AEGILOCK_API_URL'        => esc_url_raw(rest_url('aegilock/v1/formshield-verify')),
        'AEGILOCK_API_URL_SUBMIT' => esc_url_raw(rest_url('aegilock/v1/formsubmit')),
    ];
    $inline = '';
    foreach ($config as $key => $value) {
        $inline .= "window.{$key} = '{$value}';\n";
    }

    wp_add_inline_script('aegilock-widget', $inline);
}
add_action('wp_enqueue_scripts', 'aegilock_enqueue_script');

// REST-API-Endpunkt: Challenge bereitstellen
add_action('rest_api_init', function () {
    register_rest_route('aegilock/v1', '/formshield-verify', [
        'methods' => 'POST',
        'callback' => 'aegilock_handle_formshield_verify',
        'permission_callback' => '__return_true',
    ]);
});

function aegilock_generate_challenge(): string {
    return bin2hex(random_bytes(16)); // 32-stellig, PoW-ready
}

function aegilock_handle_formshield_verify(WP_REST_Request $request) {
    $params   = $request->get_json_params();
    $sitekey  = sanitize_text_field($params['sitekey'] ?? '');
    $ua       = sanitize_text_field($params['ua'] ?? '');

    if (!$sitekey) {
        return new WP_REST_Response(['error' => 'Missing sitekey'], 400);
    }

    return new WP_REST_Response([
        'challenge'  => aegilock_generate_challenge(),
        'difficulty' => 4,
        'timestamp'  => time(),
        'sitekey'    => $sitekey,
    ], 200);
}

// REST-API-Endpunkt: Formularverarbeitung inkl. PoW + ML
add_action('rest_api_init', function () {
    register_rest_route('aegilock/v1', '/formsubmit', [
        'methods' => 'POST',
        'callback' => 'aegilock_handle_formsubmit',
        'permission_callback' => '__return_true',
    ]);
});

function aegilock_handle_formsubmit(WP_REST_Request $request) {
    $challenge = sanitize_text_field($request->get_param('challenge') ?? '');
    $nonce     = sanitize_text_field($request->get_param('nonce') ?? '');
    $hash      = sanitize_text_field($request->get_param('hash') ?? '');
    $sitekey   = sanitize_text_field($request->get_param('sitekey') ?? '');

    if (!$challenge || !$nonce || !$hash) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Unvollständige Angaben'
        ], 400);
    }

    $expectedHash = hash('sha256', $challenge . $nonce);
    $difficulty   = 4;
    $prefix       = str_repeat('0', $difficulty);

    if (substr($expectedHash, 0, $difficulty) !== $prefix || strtolower($hash) !== $expectedHash) {
        return new WP_REST_Response([
            'success' => false,
            'message' => 'Ungültige PoW-Lösung'
        ], 403);
    }

    // ML-Prüfung via externer API
    $features = [
        'timestamp' => gmdate('c'),
        'path' => $_SERVER['REQUEST_URI'] ?? '',
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? '',
        'status' => http_response_code(),
        'country' => $_SERVER['HTTP_X_COUNTRY'] ?? '',
        'method' => $_SERVER['REQUEST_METHOD'] ?? '',
        'MissingFetchHeaders' => isset($_SERVER['HTTP_SEC_FETCH_MODE']) ? 0 : 1,
    ];

    $response = wp_remote_post('https://aegilock.de/api/predict', [
        'headers' => [ 'Content-Type' => 'application/json' ],
        'body' => wp_json_encode($features),
        'timeout' => 4,
    ]);

    $botScore = 0.0;
    if (!is_wp_error($response)) {
        $data = json_decode(wp_remote_retrieve_body($response), true);
        $botScore = isset($data['bot_score']) ? floatval($data['bot_score']) : 0.0;
    }

    if ($botScore >= 0.7) {
        return new WP_REST_Response([
            'success' => false,
            'bot' => true,
            'message' => 'ML-Prüfung fehlgeschlagen (Score: ' . number_format($botScore, 3) . ')'
        ], 403);
    }

    return new WP_REST_Response([
        'success' => true,
        'bot' => false,
        'message' => 'Verifizierung erfolgreich'
    ], 200);
}
?>
