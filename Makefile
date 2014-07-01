### start list of variables 
### to be available 
### for use in the SETTINGS files
RANDOM := $(shell /bin/bash -c "echo $$RANDOM")
### end list

include SETTINGS

#default target, tried to reuse an existing install of node.js and bower dependencies
all: clean_cache build deploy

install: prereq configure get build deploy

#execute once before running make
configure:
	sed 's/$$RETAIL_APP_NAME/$(RETAIL_APP_NAME)/g' manifest.yml.template | \
	sed 's/$$RETAIL_APP_HOST/$(RETAIL_APP_HOST)/g' | \
	sed 's/$$SPSS_APP_NAME/$(SPSS_APP_NAME)/g' | \
	sed 's/$$SPSS_APP_HOST/$(SPSS_APP_HOST)/g' | \
	sed 's/$$WEATHER_APP_NAME/$(WEATHER_APP_NAME)/g' | \
	sed 's/$$WEATHER_APP_HOST/$(WEATHER_APP_HOST)/g' \
	> manifest.yml

	cf login

	cf cups $(ALERTS_DATABASE_SERVICE_NAME) -p "cloudantUrl,alertsDbName,alertsDbKey,alertsDbPassword"
	cf cups $(DISTRICTS_DATABASE_SERVICE_NAME) -p "cloudantUrl,districtsDbName,districtsDbKey,districtsDbPassword"

	#use an empty app contents to create the initial app instance
	mkdir -p tmp; cp package.json tmp
	cf push $(RETAIL_APP_NAME) -n $(RETAIL_APP_HOST) -p tmp --no-manifest --no-start

	cf bind-service ${RETAIL_APP_NAME} ${ALERTS_DATABASE_SERVICE_NAME}
	cf bind-service ${RETAIL_APP_NAME} ${DISTRICTS_DATABASE_SERVICE_NAME}

	cf se $(RETAIL_APP_NAME) ALERTS_DATABASE_SERVICE_NAME $(ALERTS_DATABASE_SERVICE_NAME)
	cf se $(RETAIL_APP_NAME) DISTRICTS_DATABASE_SERVICE_NAME $(DISTRICTS_DATABASE_SERVICE_NAME)
	cf se $(RETAIL_APP_NAME) WEATHER_APP_HOST $(WEATHER_APP_HOST)

	touch configure

#a target to build a new application from scratch, removing and then re-downloading all dependencies prior to rebuilding
new: clean get build deploy

prereq:
	which node
	which bower

deploy:
	cf push

build:
#	-jbuild build

get:
#	npm install

clean: clean_cache clean_deps

clean_cache:
	-rm `find . | grep DS_Store`
	-rm -rf tmp
	
clean_deps:  
	-rm -rf node_modules bower_components
