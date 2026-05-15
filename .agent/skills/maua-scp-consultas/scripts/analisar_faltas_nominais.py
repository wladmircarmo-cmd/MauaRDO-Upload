import requests
from datetime import datetime, timedelta
import json

BASE_URL = "https://scp.estaleiromaua.ind.br/_api/"
MADIS_URL = "https://scp.estaleiromaua.ind.br/ApiMaua.php"
TOKEN = "Q3d4RzZZd2NvSklyb2dUeHRLTTVEcnd3dWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

MAINTENANCE_CC = ["295700", "295701", "395700", "395701", "395702", "395703", "395704", "395705"]

def fetch_funcionarios():
    url = f"{BASE_URL}Maua_Funcionarios.php"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        response.encoding = 'utf-8-sig'
        return response.json()
    else:
        print(f"Error fetching funcionarios: {response.status_code}")
        return []

def fetch_portaria(data_ini, data_fim):
    response = requests.get(
        MADIS_URL,
        headers=HEADERS,
        params={"op": "consulta_madis", "data_inicial": data_ini, "data_final": data_fim},
    )
    if response.status_code == 200:
        response.encoding = 'utf-8-sig'
        return response.json()
    else:
        print(f"Error fetching portaria: {response.status_code}")
        return []

def main():
    # 1. Get all funcionarios
    print("Fetching employees...")
    funcionarios = fetch_funcionarios()
    
    # 2. Filter Active Welders (excluding maintenance)
    welders = []
    for f in funcionarios:
        if f.get('codsituacao') == 'A':
            funcao = f.get('funcao', '').upper()
            cc_val = str(f.get('ccusto'))
            if "SOLDADOR" in funcao and cc_val not in MAINTENANCE_CC:
                welders.append({
                    'chapa': f.get('chapa'),
                    'nome': f.get('nome'),
                    'funcao': f.get('funcao'),
                    'ccusto': f.get('ccusto'),
                    'descr_ccusto': f.get('descr_ccusto')
                })
    
    print(f"Found {len(welders)} active welders (excluding maintenance).")
    
    # 3. Define date range
    today = datetime(2026, 4, 29) # Based on additional metadata
    dates = [(today - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(5)]
    dates.sort()
    data_ini = dates[0]
    data_fim = dates[-1]
    
    print(f"Fetching access logs from {data_ini} to {data_fim}...")
    access_logs = fetch_portaria(data_ini, data_fim)
    
    if access_logs:
        print(f"Sample log: {access_logs[0]}")
    else:
        print("No logs found in portaria.")
    
    # 4. Map access by chapa and date
    # Structure: access_map[date][chapa] = True
    access_map = {date: {} for date in dates}
    for log in access_logs:
        if str(log.get('TP_SENTIDO_CONSULTA', '')).strip() != '1':
            continue
        chapa = log.get('CHAPA')
        log_date = log.get('DATA', '')
        
        if log_date in access_map:
            access_map[log_date][chapa] = True
            
    for date in dates:
        print(f"Date {date}: {len(access_map[date])} distinct accesses.")
            
    # 5. Identify absences
    absences = []
    for welder in welders:
        chapa = welder['chapa']
        welder_absences = []
        for date in dates:
            if chapa not in access_map[date]:
                welder_absences.append(date)
        
        if welder_absences:
            absences.append({
                'chapa': welder['chapa'],
                'nome': welder['nome'],
                'funcao': welder['funcao'],
                'ccusto': welder['ccusto'],
                'descr_ccusto': welder['descr_ccusto'],
                'datas_ausencia': welder_absences
            })
            
    # 6. Output
    result = {
        'periodo': f"{data_ini} a {data_fim}",
        'total_soldadores_ativos': len(welders),
        'total_com_ausencia': len(absences),
        'absencias': absences
    }
    
    with open('absences_result.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("Analysis complete. Results saved to absences_result.json.")

if __name__ == "__main__":
    main()
