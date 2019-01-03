rm index.zip
rm out.json
zip -r index.zip *
zip -d index.zip "deploy.sh"
aws lambda update-function-code --function-name weekendNotifier --zip-file fileb://index.zip