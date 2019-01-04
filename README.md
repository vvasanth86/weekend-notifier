# weekend-notifier
====

Lambda function that identifies long weekends, potential long weekends and notifies subscribers via email ahead of time (either 120 days ahead or 30 days ahead) to help better plan for long weekends. 

## Setup

    Lambda is setup as a CRON (triggered once everyday), identifies weekends and notifies subscribers via email. 

## Deploy Function to Lambda

Configure AWS CLI and then run the following command:

	npm run-script deploy

## Test

	npm test
