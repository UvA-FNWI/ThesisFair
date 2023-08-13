# This script receives a pod name as argument and logs it.

# Check if any argument is -f (follow) and -s (starting)
is_follow=false
is_starting=false

for arg in $@
do
    if [ $arg == "-f" ]
    then
        is_follow=true
    fi

    if [ $arg == "-s" ]
    then
        is_starting=true
    fi
done

# Get the pod name from the arguments passed to the script
POD_NAME=$@

# Remove the -f argument from the pod name
POD_NAME=${POD_NAME//-f/}

echo "Finding $POD_NAME"

if [ $is_starting == true ]
then
    # Find the pod deployment based on the pod name
    POD_DEPLOMENT=$(kubectl -n thesisfair get pods | grep $POD_NAME | grep -v Running | awk '{print $1}')
else
    # Find the pod deployment based on the pod name
    POD_DEPLOMENT=$(kubectl -n thesisfair get pods | grep $POD_NAME | grep Running | awk '{print $1}')
fi

if [ -z "$POD_DEPLOMENT" ]
then
    echo "No pod found"
    exit 1
fi

echo "Found pod $POD_DEPLOMENT"

# If the -f argument was passed, follow the logs
if [ $is_follow == true ]
then
    echo "Following logs for $POD_DEPLOMENT"
    kubectl -n thesisfair logs pod/$POD_DEPLOMENT -f
    continue
else
    echo "Getting logs for $POD_DEPLOMENT"
    kubectl -n thesisfair logs pod/$POD_DEPLOMENT
fi
