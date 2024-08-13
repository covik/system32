#!/bin/bash

ns='NAMESPACE:.metadata.namespace'
pod="POD:.metadata.name"
cont='CONTAINER:.spec.containers[*].name'
mreq='MEM_REQ:.spec.containers[*].resources.requests.memory'
mlim='MEM_LIM:.spec.containers[*].resources.limits.memory'
creq='CPU_REQ:.spec.containers[*].resources.requests.cpu'
clim='CPU_LIM:.spec.containers[*].resources.limits.cpu'

kubectl get pod -A -o custom-columns="$ns,$pod,$cont,$mreq,$mlim,$creq,$clim"