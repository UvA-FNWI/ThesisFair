# This script receives a pod name as argument and logs it.

# Check if any argument is -f (follow)
is_follow=false

for arg in $@
do
    if [ $arg == "-f" ]
    then
        is_follow=true
    fi
done

# Get the pod name from the arguments passed to the script
POD_NAME=$@

# Remove the -f argument from the pod name
POD_NAME=${POD_NAME//-f/}

echo "Finding $POD_NAME"

# Find the pod deployment based on the pod name
POD_DEPLOMENT=$(kubectl get deployment | grep $POD_NAME | awk '{print $1}')

echo "Found deployment $POD_DEPLOMENT"

# If the -f argument was passed, follow the logs
if [ $is_follow == true ]
then
    echo "Following logs for $POD_DEPLOMENT"
    kubectl logs deployment/$POD_DEPLOMENT -f
    continue
else
    echo "Getting logs for $POD_DEPLOMENT"
    kubectl logs deployment/$POD_DEPLOMENT
fi
