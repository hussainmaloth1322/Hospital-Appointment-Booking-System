
pipeline {
    agent any

    stages {
        stage('Git Checkout') {
            steps {
                echo 'Downloading project from GitHub'
                checkout scm
            }
        }

        stage('Check Node and NPM') {
            steps {
                bat 'node --version'
                bat 'npm --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Build') {
            steps {
                echo 'Building Hospital Appointment Booking System'
                bat 'npm run build --if-present'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test --if-present'
            }
        }
    }

    post {
        success {
            echo 'Hospital project pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Jenkins console output.'
        }
    }
}
