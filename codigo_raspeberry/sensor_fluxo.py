# pip install RPi.GPIO requests 
import RPi.GPIO as GPIO
import time
import json
import requests

# caminho da ligacao ao nodejs
url = 'http://localhost:3000/sensor_fluxo'

# Criar uma classe ou objeto serializável
class Dados:
    def __init__(self, variavel1, variavel2, variavel3):
        self.id = variavel1
        self.data = variavel2
        self.quantidade = variavel3

# Variaveis
pino_sensor_fluxo = 2
flow_count = 0


# Configurar o pino GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(pino_sensor_fluxo, GPIO.IN, pull_up_down=GPIO.PUD_UP)

def countPulse(channel):
    global flow_count
    flow_count += 1

GPIO.add_event_detect(pino_sensor_fluxo, GPIO.FALLING, callback=countPulse)

def calculate_flow(flow_count, time_sec):
    if time_sec != 0:
        flow_rate = (flow_count / time_sec)
        return flow_rate
    else:
        return 0

def main():
    try:
        while True:
            start_time = time.time()
            start_count = flow_count
            time.sleep(1)  # Medição durante 1 segundo
            
            end_time = time.time()
            end_count = flow_count

            flow_rate = calculate_flow(end_count - start_count, end_time - start_time)
                       # Criar uma instância do objeto com os valores
            dados = Dados('jFEjGUB8wEufOnt4ss1O', end_time, flow_rate)

            # Serializar o objeto para JSON
            dados_json = json.dumps(dados, default=lambda o: o.__dict__)

            # Enviar a solicitação POST para o servidor
            response = requests.post(url, json=dados_json)

    except KeyboardInterrupt:
        print("\nPrograma interrompido pelo utilizador")

    finally:
        GPIO.cleanup()

if __name__ == '__main__':
    main()
