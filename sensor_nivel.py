# pip install RPi.GPIO requests 
import RPi.GPIO as GPIO
import time
import json
import requests

# Configurações do sensor ultrassônico
TRIG_PIN = 20  # Pino de transmissão (Trig)
ECHO_PIN = 21  # Pino de recepção (Echo)

# Configuração do GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(TRIG_PIN, GPIO.OUT)
GPIO.setup(ECHO_PIN, GPIO.IN)

# Função para medir o nível de água
def medir_nivel_agua():
    # Dispara o pulso ultrassônico
    GPIO.output(TRIG_PIN, GPIO.HIGH)
    time.sleep(0.00001)
    GPIO.output(TRIG_PIN, GPIO.LOW)

    # Espera pelo início do pulso de retorno
    while GPIO.input(ECHO_PIN) == GPIO.LOW:
        pulse_start = time.time()

    # Espera pelo fim do pulso de retorno
    while GPIO.input(ECHO_PIN) == GPIO.HIGH:
        pulse_end = time.time()

    # Calcula a duração do pulso
    pulse_duration = pulse_end - pulse_start

    # Calcula a distância em centímetros
    distance = pulse_duration * 17150

    # Retorna o nível de água em centímetros
    return distance


try:
    while True:
        # Realiza a medição do nível de água
        nivel_agua = medir_nivel_agua()
        tempo_atual = time.time()

        # Enviar a solicitação POST para o servidor
        dados = {
            "id": 'MbhdRaK1sGkuRsK3Ic8r',
             "data": tempo_atual,
             "nivel": nivel_agua
             }
            
        print(dados)

        response = requests.post('http://localhost:3000/sensor_nivel', json=dados)

        # Aguarda um intervalo de 1 segundo antes da próxima medição
        time.sleep(1)


except KeyboardInterrupt:
    print('Programa interrompido pelo utilizador')
finally:
    # Limpa a configuração do GPIO
    GPIO.cleanup()
