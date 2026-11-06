pipeline {
    agent any

    environment {
        APP_IMAGE = 'hospital-appointment-app:latest'
        APP_CONTAINER = 'hospital-appointment-ci'
        APP_PORT = '3001'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm ci || npm install'
                    } else {
                        bat 'npm install'
                    }
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npm test'
                    } else {
                        bat 'npm test'
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker build -t $APP_IMAGE .'
                    } else {
                        bat 'docker build -t %APP_IMAGE% .'
                    }
                }
            }
        }

        stage('Run Container') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker rm -f $APP_CONTAINER || true'
                        sh 'docker run -d --name $APP_CONTAINER -p $APP_PORT:3000 $APP_IMAGE'
                        sh 'python3 -c "import time,urllib.request; u=\\\"http://127.0.0.1:3001/health\\\"; [urllib.request.urlopen(u) for _ in range(1)]; print(\\\"Application health check passed\\\")"'
                    } else {
                        bat 'docker rm -f %APP_CONTAINER% 2>NUL || exit /b 0'
                        bat 'docker run -d --name %APP_CONTAINER% -p %APP_PORT%:3000 %APP_IMAGE%'
                        bat 'python -c "import time,urllib.request; print(urllib.request.urlopen(\\\"http://127.0.0.1:3001/health\\\").read().decode())"'
                    }
                }
            }
        }

        stage('Selenium E2E Tests') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'python3 -m pip install selenium'
                        sh 'BASE_URL=http://127.0.0.1:3001 python3 -m unittest discover -s tests -p "test_hospital.py" -v'
                    } else {
                        bat 'python -m pip install selenium'
                        bat 'set BASE_URL=http://127.0.0.1:3001 && python -m unittest discover -s tests -p "test_hospital.py" -v'
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                if (isUnix()) {
                    sh 'docker rm -f $APP_CONTAINER || true'
                } else {
                    bat 'docker rm -f %APP_CONTAINER% 2>NUL || exit /b 0'
                }
            }
        }
    }
}
