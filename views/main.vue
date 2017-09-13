<template>
    <div class="container">
        <h1>Link Budget Requests</h1>
        <hr>
        <table class="table table-bordered">
            <thead>
                <th>Index</th>
                <th>Name</th>
                <th>Requestor</th>
                <th>Link</th>
            </thead>
            <tbody>
                <tr v-for="(req, index) in requests">
                    <td>{{index + 1}}</td>
                    <td>{{req.assumptions.request_name}}</td>
                    <td>{{req.requestor_name}}</td>
                    <td><a :href="generateUrl(req._id)">Link</a></td>
                </tr>
            </tbody>

        </table>
    </div>
</template>

<script>

    export default {
        data() {
            return {
                gg: 'Test',
            }
        },
        computed: {

        },
        methods: {
            generateUrl(_id) {
                return `http://linkcalc.thaicom.net/results/${_id}`;
            }
        }

    }
</script>