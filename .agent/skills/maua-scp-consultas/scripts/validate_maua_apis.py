#!/usr/bin/env python3
import argparse
import json
import os
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


DEFAULT_TOKEN_ENV = "MAUA_API_TOKEN"
DEFAULT_TIMEOUT = 120

EXTERNAL_ENDPOINTS = [
    ("CC_ext", "https://scp.estaleiromaua.ind.br/_api/Maua_CC.php", {}),
    (
        "Timesheet_ext",
        "https://scp.estaleiromaua.ind.br/_api/Maua_Timesheet.php",
        {"data_inicial": "2025-07-01", "data_final": "2025-07-15"},
    ),
    (
        "Portaria_ext",
        "https://scp.estaleiromaua.ind.br/ApiMaua.php",
        {"op": "consulta_madis", "data_inicial": "2026-04-28", "data_final": "2026-04-29"},
    ),
    ("Funcionarios_ext", "https://scp.estaleiromaua.ind.br/_api/Maua_Funcionarios.php", {}),
    ("EAP_ext", "https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php", {}),
    ("EAP_CC_ext", "https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php", {"codccusto": "020173"}),
    (
        "JC_ext",
        "https://scp.estaleiromaua.ind.br/_api/Maua_JC.php",
        {"Dataini": "2026-01-01", "Datafim": "2026-01-10"},
    ),
    (
        "Pendencias_ext",
        "https://scp.estaleiromaua.ind.br/_api/Maua_Pendencias.php",
        {"data_ini": "2026-02-01", "data_fim": "2026-02-15"},
    ),
    (
        "ProgressoOS_ext",
        "https://scp.estaleiromaua.ind.br/_api/Maua_ProgressoOS.php",
        {"codccusto": "020243"},
    ),
]

INTERNAL_ENDPOINTS = [
    ("CC_int", "http://172.16.8.130/PowerBI/Maua_CC.php", {}),
    (
        "Timesheet_int",
        "http://172.16.8.130/PowerBI/Maua_Timesheet.php",
        {"data_inicial": "2025-07-01", "data_final": "2025-07-15"},
    ),
    (
        "Portaria_int",
        "http://172.16.8.130/PowerBI/ApiMaua.php",
        {"op": "consulta_madis", "data_inicial": "2026-04-28", "data_final": "2026-04-29"},
    ),
    ("Funcionarios_int", "http://172.16.8.130/PowerBI/Maua_Funcionarios.php", {}),
    ("EAP_int", "http://172.16.8.130/PowerBI/Maua_Eap.php", {}),
    ("EAP_CC_int", "http://172.16.8.130/PowerBI/Maua_Eap.php", {"codccusto": "020173"}),
    (
        "JC_int",
        "http://172.16.8.130/PowerBI/Maua_JC.php",
        {"Dataini": "2026-01-01", "Datafim": "2026-01-10"},
    ),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Valida as APIs Maua SCP e resume schema, contagem e status.")
    parser.add_argument(
        "--token",
        default=os.environ.get(DEFAULT_TOKEN_ENV),
        help=f"Bearer token valido. Se omitido, usa a variavel {DEFAULT_TOKEN_ENV}.",
    )
    parser.add_argument(
        "--bad-token",
        default=None,
        help="Token adicional para validar retornos de erro.",
    )
    parser.add_argument(
        "--include-internal",
        action="store_true",
        help="Inclui os endpoints internos na validacao.",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Arquivo JSON de saida. Se omitido, grava apenas no stdout.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Timeout por requisicao em segundos. Padrao: {DEFAULT_TIMEOUT}.",
    )
    return parser.parse_args()


def normalize_token(raw_value: str | None) -> str:
    token = (raw_value or "").strip().strip('"').strip("'")
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return token


def fetch_payload(url: str, token: str, timeout: int) -> tuple[int | str, str | None, str]:
    request = urllib.request.Request(url)
    request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8-sig", errors="replace")
            return response.getcode(), response.headers.get("Content-Type"), body
    except urllib.error.HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")
        return exc.code, None, message
    except urllib.error.URLError as exc:
        return "ERR", None, str(exc)


def summarize_json(body: str) -> dict:
    entry: dict = {}

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        entry["body_preview"] = body[:1000]
        return entry

    entry["json_type"] = type(data).__name__

    if isinstance(data, list):
        entry["count"] = len(data)
        keys: list[str] = []
        for item in data[:50]:
            if not isinstance(item, dict):
                continue
            for key in item:
                if key not in keys:
                    keys.append(key)
        entry["keys"] = keys
        entry["sample"] = data[:2]
        return entry

    if isinstance(data, dict):
        entry["keys"] = list(data.keys())
        entry["sample"] = data
        if isinstance(data.get("dados"), list):
            entry["count"] = len(data["dados"])
            inner_keys: list[str] = []
            for item in data["dados"][:50]:
                if not isinstance(item, dict):
                    continue
                for key in item:
                    if key not in inner_keys:
                        inner_keys.append(key)
            entry["dados_keys"] = inner_keys
        return entry

    entry["sample"] = data
    return entry


def build_endpoints(include_internal: bool) -> list[tuple[str, str, dict]]:
    endpoints = list(EXTERNAL_ENDPOINTS)
    if include_internal:
        endpoints.extend(INTERNAL_ENDPOINTS)
    return endpoints


def build_url(base_url: str, params: dict) -> str:
    if not params:
        return base_url
    return f"{base_url}?{urllib.parse.urlencode(params)}"


def main() -> int:
    ssl._create_default_https_context = ssl._create_unverified_context
    args = parse_args()

    valid_token = normalize_token(args.token)
    if not valid_token:
        raise SystemExit(f"Informe --token ou defina a variavel de ambiente {DEFAULT_TOKEN_ENV}.")

    tokens = [("token_ok", valid_token)]
    bad_token = normalize_token(args.bad_token)
    if bad_token:
        tokens.append(("token_ruim", bad_token))

    results = []
    for token_name, token in tokens:
        for endpoint_name, base_url, params in build_endpoints(args.include_internal):
            url = build_url(base_url, params)
            status, content_type, body = fetch_payload(url, token, args.timeout)
            item = {
                "token": token_name,
                "endpoint": endpoint_name,
                "url": url,
                "status": status,
                "content_type": content_type,
            }
            item.update(summarize_json(body))
            results.append(item)

    if args.output:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    for item in results:
        print(
            f"{item['token']:<10} {item['endpoint']:<18} "
            f"status={item['status']:<4} "
            f"type={item.get('json_type', ''):<6} "
            f"count={str(item.get('count', '')):<8} "
            f"keys={len(item.get('keys', [])):<3} "
            f"dados_keys={len(item.get('dados_keys', [])):<3}"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
