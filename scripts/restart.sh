# This script receives pod names as arguments and deletes them.

# Get the pod names from the arguments passed to the script
POD_NAMES=$@

# Iterate over the pod names
for POD_NAME in $POD_NAMES
do
    echo "Deleting pod $POD_NAME"

    # Find the pod id based on the pod name
    POD_ID=$(kubectl get pods | grep $POD_NAME | awk '{print $1}')

    echo "Found pod id $POD_ID"

    # Delete the pod
    kubectl delete pod $POD_ID &
done

# Wait for all the commands in the for loop to finish
wait
